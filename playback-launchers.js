(() => {
    const title = document.getElementById("PlaybackTitle");
    if (!title || document.getElementById("playback-service-launchers")) {
        return;
    }

    const row = document.createElement("div");
    row.id = "playback-service-launchers";
    row.className = "d-flex flex-wrap d-none";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Music service pickers");
    title.after(row);

    const services = [
        ["Pandora", "Pandora", "pandora-cc0.png"],
        ["TuneIn", "TuneIn Favorites", "tunein-cc0-512.png"],
        ["iHeartRadio", "iHeartRadio Favorites", "iheart-radio-cc0.png"]
    ];
    const assetBase = new URL("thumbs/", document.currentScript.src);
    const buttons = new Map();
    for (const [label, script, image] of services) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-secondary me-2 mb-2";
        const icon = document.createElement("img");
        icon.src = new URL(image, assetBase).href;
        icon.alt = "";
        icon.width = 24;
        icon.height = 24;
        icon.className = "me-2";
        icon.addEventListener("error", () => icon.remove(), {once: true});
        button.append(icon, label);
        button.addEventListener("click", () => execScriptFromOptions(script, [""]));
        buttons.set(script, button);
    }

    function renderRadioMetadata() {
        const song = typeof currentSongObj === "undefined" ? null : currentSongObj;
        if (!song?.uri || !song.Title) return;
        const uri = new URL(song.uri, document.baseURI);
        const source = new URLSearchParams(uri.hash.slice(1));
        if (!source.has("mympd-tunein") && !source.has("mympd-iheart") &&
            !uri.hostname.endsWith(".somafm.com")) return;

        const raw = song.Title.trim();
        const wrapped = raw.match(/^(?:currently playing track:\s*)?title="(.*?)",\s*artist="([^"]*)"/iu);
        // iHeart can prefix a metadata block with a feed ID, such as zc105.
        if (!wrapped && /(?:^|\s)[a-z][\w-]*\s*=\s*"/iu.test(raw)) return;
        if (/(?:adcontext|adswizzcontext)=|song_spot="A"/iu.test(raw)) return;
        const split = wrapped ? null : raw.match(/^(.+?)\s+[-–—]\s+(.+)$/u);
        const artist = wrapped?.[2]?.trim() || split?.[1]?.trim();
        const track = wrapped ? raw.match(/(?:^|\s)text="([^"]*)"/iu)?.[1] || wrapped[1]
            : split?.[2];
        const album = wrapped ? raw.match(/(?:^|[,\s])album="([^"]*)"/iu)?.[1] : null;
        const station = source.get("name") || song.Name;
        if (!artist || /^null$/i.test(artist) || !track ||
            /^spot block (?:start|end)$/iu.test(track) ||
            [station, song.Name].some(name => typeof name === "string" &&
                name.trim().toLowerCase() === artist.toLowerCase())) return;

        const artistField = document.querySelector("#currentArtist p");
        const albumField = document.querySelector("#currentAlbum p");
        const hasArtist = Array.isArray(song.Artist) ? song.Artist.length > 0 : Boolean(song.Artist);
        if (!hasArtist && artistField && artistField.textContent !== artist) {
            artistField.textContent = artist;
        }
        if (!song.Album && album && albumField && albumField.textContent !== album) {
            albumField.textContent = album;
        }
        const displayed = title.textContent;
        if (!hasArtist && displayed !== track &&
            (displayed === raw || displayed.toLowerCase().startsWith(artist.toLowerCase() + " - ") ||
                displayed.toLowerCase().startsWith(artist.toLowerCase() + " — "))) {
            title.textContent = track;
        }
    }

    // Wait for myMPD to finish updating its song object and other display hooks.
    let pending;
    const metadataObserver = new MutationObserver(() => {
        if (pending === undefined) {
            pending = setTimeout(() => {
                pending = undefined;
                renderRadioMetadata();
            }, 0);
        }
    });
    for (const id of ["PlaybackTitle", "footerTitle", "PlaybackListTags"]) {
        const target = document.getElementById(id);
        if (target) metadataObserver.observe(target, {childList: true, subtree: true});
    }
    renderRadioMetadata();

    let installed = new Set();
    const observer = new MutationObserver(updateButtons);

    function updateButtons() {
        const candidates = [
            ...buttons,
            ["SomaFM", document.getElementById("somafm-picker")],
            ["iBroadcast", document.getElementById("ibroadcast-picker")]
        ];
        let previous = null;
        for (const [script, button] of candidates) {
            if (!button) continue;
            const available = installed.has(script);
            button.classList.toggle("d-none", !available);
            if (available) {
                const next = previous ? previous.nextElementSibling : row.firstElementChild;
                if (next !== button) row.insertBefore(button, next);
                previous = button;
            }
        }
        row.classList.toggle("d-none", previous === null);
    }

    // SomaFM and iBroadcast add their own buttons and may load asynchronously.
    observer.observe(title.parentNode, {childList: true});
    updateButtons();
    sendAPI("MYMPD_API_SCRIPT_LIST", {all: true}, response => {
        const scripts = response.result?.data;
        if (Array.isArray(scripts)) {
            installed = new Set(scripts.map(script => script.name));
            updateButtons();
        }
    }, false);
})();
