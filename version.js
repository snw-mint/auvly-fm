const packageJsonUrl = `https://raw.githubusercontent.com/snw-mint/tunecharts/main/package.json?t=${new Date().getTime()}`;

document.addEventListener("DOMContentLoaded", () => {
    fetch(packageJsonUrl)
        .then((response) => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then((data) => {
            const versionElements = document.querySelectorAll(".versao");
            versionElements.forEach((element) => {
                element.textContent = `v${data.version}`;
                
                if (element.tagName === "A") {
                    const isSubPage = window.location.pathname.split("/").length > 2;
                    const prefix = isSubPage ? "../" : "";
                    element.setAttribute("href", `${prefix}changelog.html`);
                }
            });
        })
        .catch((error) => {
            console.error("Failed to load version:", error);
        });
});