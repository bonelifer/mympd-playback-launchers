#!/usr/bin/env python3
"""Install or update the shared Playback launcher in a myMPD work directory."""

import argparse
import os
import re
import stat
import tempfile
from pathlib import Path

START = "/* mympd-playback-launchers: begin */"
END = "/* mympd-playback-launchers: end */"
MANAGED = re.compile(
    rf"(?ms)^{re.escape(START)}\n.*?^{re.escape(END)}\n?"
)
LEGACY = re.compile(
    r"(?ms)^\(\(\) => \{\n"
    r"(?:(?!^\}\)\(\);).)*"
    r'browse/pics/playback-launchers\.js\?v=\d+"'
    r"(?:(?!^\}\)\(\);).)*^\}\)\(\);\n?"
)


def replace_file(path: Path, data: bytes) -> None:
    """Atomically replace a regular file while preserving its mode."""
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise OSError(f"Expected a regular file: {path}")
    if path.exists() and path.read_bytes() == data:
        return
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as out:
            temporary = Path(out.name)
            out.write(data)
            os.fchmod(out.fileno(), mode)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def install(workdir: Path, bundle: Path) -> None:
    """Copy the asset and update only its loader block."""
    config = workdir / "config"
    pictures = workdir / "pics"
    if not config.is_dir() or not pictures.is_dir():
        raise ValueError("--workdir must contain myMPD's config and pics directories")
    candidates = [config / name for name in ("custom.js", "custom_js")]
    existing = [path for path in candidates if path.exists() or path.is_symlink()]
    if len(existing) > 1:
        raise ValueError("Both config/custom.js and config/custom_js exist")
    custom = existing[0] if existing else candidates[0]
    if custom.is_symlink() or (custom.exists() and not custom.is_file()):
        raise OSError(f"Expected a regular file: {custom}")
    original = custom.read_bytes().decode("utf-8") if existing else ""
    loader = (bundle / "playback-launchers-loader.js").read_text(encoding="utf-8")
    block = f"{START}\n{loader.rstrip()}\n{END}\n"
    if START in original or END in original:
        if original.count(START) != 1 or original.count(END) != 1:
            raise ValueError("Multiple or incomplete Playback loader markers")
        updated, count = MANAGED.subn(lambda _: block, original)
        if count != 1:
            raise ValueError("Invalid Playback loader block")
    else:
        updated, count = LEGACY.subn(lambda _: block, original)
        if count > 1 or (count == 0 and "playback-launchers.js" in original):
            raise ValueError("Unrecognized or duplicate Playback loader")
        if count == 0:
            updated = original + ("" if not original or original.endswith("\n") else "\n") + block
    script = bundle / "playback-launchers.js"
    replace_file(pictures / script.name, script.read_bytes())
    replace_file(custom, updated.encode("utf-8"))


def main() -> None:
    """Parse the work directory, install the files, and report the next step."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-w", "--workdir", type=Path, required=True,
                        help="myMPD's local or mounted work directory")
    args = parser.parse_args()
    try:
        install(args.workdir, Path(__file__).resolve().parent)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Installation failed: {error}\n")
    print("Playback launchers installed. Restart myMPD and refresh Playback.")


if __name__ == "__main__":
    main()
