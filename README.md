# myMPD Playback Launchers

Open Pandora, TuneIn, iHeartRadio, SomaFM, and iBroadcast from one row on
the myMPD Playback page. The script also separates artist and song title
when TuneIn, iHeartRadio, or SomaFM supplies them in one field.

Install the service pickers you want to use and their Home tile icons.
The row shows only installed pickers. For SomaFM and iBroadcast, also
install their Playback scripts from their respective repositories.
Refresh myMPD after installing or removing a picker.

Run the installer with write access to myMPD's work directory:

```sh
python3 install-playback.py --workdir /path/to/mympd/workdir
```

It copies the browser script into `pics/` and adds or updates its loader
in the existing custom JavaScript file. Restart myMPD and refresh the
Playback page. Run the same command to update an existing installation.

## Contributing

- **Bug reports**: [Open an issue](https://github.com/bonelifer/mympd-playback-launchers/issues).
- **Questions and ideas**: [Use Discussions](https://github.com/bonelifer/mympd-playback-launchers/discussions).

## Acknowledgments

- Code and documentation assisted by [Codex](https://openai.com/codex/).

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).
