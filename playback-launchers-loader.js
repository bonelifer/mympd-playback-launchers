(() => {
    const script = document.createElement("script");
    const url = new URL("browse/pics/playback-launchers.js?v=4", document.currentScript.src).href;
    const policy = window.trustedTypes?.createPolicy("playback-service-launchers", {
        createScriptURL(candidate) {
            if (candidate !== url) {
                throw new TypeError("Unexpected Playback launcher script URL");
            }
            return url;
        }
    });
    script.src = policy ? policy.createScriptURL(url) : url;
    document.head.append(script);
})();
