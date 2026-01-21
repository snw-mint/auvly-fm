const packageJsonUrl = `package.json?t=${new Date().getTime()}`;

document.addEventListener("DOMContentLoaded", () => {

    const APP_VERSION = "v5.0.0"; 
    const versionElements = document.querySelectorAll(".versao, #versao");

    versionElements.forEach(element => {
        element.textContent = APP_VERSION;
        if (element.tagName === "A" && !element.getAttribute('href')) {
             element.href = "https://github.com/AuvlyFM/auvlyfm.github.io//releases";
        }
    });

    console.log(`Auvly ${APP_VERSION} loaded.`);
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
