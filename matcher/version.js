const packageJsonUrl = `package.json?t=${new Date().getTime()}`;

document.addEventListener("DOMContentLoaded", () => {
    fetch(packageJsonUrl)
        .then((response) => {
            if (!response.ok) throw new Error("Error reading the version");
            return response.json();
        })
        .then((data) => {
            const versionElements = document.querySelectorAll(".versao");
            
            versionElements.forEach((element) => {
                element.textContent = `v${data.version}`;
            });
        })
        .catch((error) => {
            console.error("Version Error:", error);
        });
});
document.addEventListener("DOMContentLoaded", () => {
    const scrollBtn = document.getElementById("scrollTopBtn");
    if (scrollBtn) {
        window.addEventListener(
            "scroll",
            () => {
                if (window.scrollY > 300) {
                    scrollBtn.classList.add("visible");
                } else {
                    scrollBtn.classList.remove("visible");
                }
            },
            { passive: !0 }
        );
        scrollBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
});