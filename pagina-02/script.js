const imageUrls = {
  heroLostSonImage: "/pagina-02/cena-01.webp",
  motherNightImage: "/pagina-02/cena-02.webp",
  prayerWindowImage: "/pagina-02/cena-03.webp",
  productMockupImage: "/pagina-02/cena-04.webp",
  devotionalMockupImage: "/pagina-02/cena-05.webp",
  finalEmbraceImage: "/pagina-02/cena-07.webp",
};

function applyImages() {
  document.querySelectorAll("[data-image-var]").forEach((element) => {
    const key = element.dataset.imageVar;
    const url = imageUrls[key];

    if (url) {
      const image = document.createElement("img");
      image.src = url;
      image.alt = "";
      image.loading = key === "heroLostSonImage" ? "eager" : "lazy";
      image.decoding = "async";
      element.replaceChildren(image);
      element.classList.add("has-image");
    }
  });
}

function splitWords() {
  document.querySelectorAll(".words").forEach((element) => {
    const text = element.textContent.trim();
    element.textContent = "";

    text.split(" ").forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.style.transitionDelay = `${Math.min(index * 55, 520)}ms`;
      element.appendChild(span);

      if (index < text.split(" ").length - 1) {
        element.appendChild(document.createTextNode(" "));
      }
    });
  });
}

function observeReveals() {
  const scenes = Array.from(document.querySelectorAll(".scene"));

  function updateSteps() {
    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));

      scene.querySelectorAll(".reveal-step").forEach((element) => {
        const step = Number(element.dataset.step || 0.2);
        element.classList.toggle("in", progress >= step);
      });
    });
  }

  updateSteps();
  window.addEventListener("scroll", updateSteps, { passive: true });
  window.addEventListener("resize", updateSteps);
}

function observeScenes() {
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.24 },
  );

  document.querySelectorAll(".scene").forEach((scene) => sceneObserver.observe(scene));
}

function observeCopyStart() {
  const copyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const scene = entry.target.closest(".scene");
        if (scene) {
          scene.classList.toggle("has-copy", entry.isIntersecting);
        }
      });
    },
    {
      rootMargin: "-42% 0px -42% 0px",
      threshold: 0,
    },
  );

  document.querySelectorAll(".scene-content").forEach((content) => copyObserver.observe(content));
}

applyImages();
splitWords();
observeReveals();
observeScenes();
observeCopyStart();
