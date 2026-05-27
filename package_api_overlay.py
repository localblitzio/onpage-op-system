from __future__ import annotations

import shutil
import zipfile
from pathlib import Path


ROOT = Path(r"D:\CC-Cora 7.2")
DEV = ROOT / "Cora SEO Software"
BUILD = DEV / "build"
BASE = DEV / "cora.jar"
OUT = DEV / "cora-recompiled.jar"
DEPLOY = ROOT / "SEO Correlation Tool 2026" / "cora-recompiled.jar"
DEPLOY_FRESH = ROOT / "SEO Correlation Tool 2026 Fresh GUI" / "cora-recompiled.jar"


def backup(path: Path) -> None:
    if path.exists():
        target = path.with_name(path.name + ".bak_api_overlay")
        shutil.copy2(path, target)
        print(f"backup {target}")


def main() -> int:
    overlay = ["cora/Main.class"]
    overlay.extend(str(p.relative_to(BUILD)).replace("\\", "/") for p in (BUILD / "cora/api").glob("*.class"))
    overlay.extend(str(p.relative_to(BUILD)).replace("\\", "/") for p in (BUILD / "cora/util").glob("BatchRunner*.class"))
    overlay = sorted(set(overlay))

    missing = [name for name in overlay if not (BUILD / name).exists()]
    if missing:
        raise SystemExit(f"Missing compiled overlay classes: {missing}")

    backup(OUT)
    with zipfile.ZipFile(BASE, "r") as zin, zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
        overlay_set = set(overlay)
        written = set()
        for item in zin.infolist():
            if item.filename in overlay_set or item.filename in written:
                continue
            written.add(item.filename)
            zout.writestr(item, zin.read(item.filename))
        for name in overlay:
            written.add(name)
            zout.write(BUILD / name, name)

    with zipfile.ZipFile(OUT) as z:
        names = set(z.namelist())
        print("MAIN", "cora/Main.class" in names)
        print("API", "cora/api/CoraAPIServer.class" in names)
        refs = [name for name in names if name.endswith(".class") and b"CoraAPIServer" in z.read(name)]
        print("REFS", refs)
        if "cora/Main.class" not in names or "cora/api/CoraAPIServer.class" not in names:
            raise SystemExit("JAR validation failed")
        if not any(name != "cora/api/CoraAPIServer.class" for name in refs):
            raise SystemExit("No startup class references CoraAPIServer")

    for dest in [DEPLOY, DEPLOY_FRESH]:
        if dest.parent.exists():
            backup(dest)
            shutil.copy2(OUT, dest)
            print(f"copied {dest}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

