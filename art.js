const artLinks = Array.from(document.querySelectorAll(".art-gallery a"));
const artViewer = document.querySelector(".art-viewer");
const artTitle = document.querySelector("#viewer-title");
const artImageContainer = document.querySelector(".art-viewer-image");
const artPosition = document.querySelector("[data-art-position]");
const artOriginal = document.querySelector("[data-art-original]");
let artIndex = 0;
let artOpener = null;

function showArt(index) {
  artIndex = (index + artLinks.length) % artLinks.length;
  const link = artLinks[artIndex];
  const source = link.querySelector("img");
  const image = new Image();
  image.alt = source.alt;
  image.src = link.href;
  artImageContainer.replaceChildren(image);
  artTitle.textContent = source.alt;
  artPosition.textContent = `${artIndex + 1} / ${artLinks.length}`;
  artOriginal.href = link.href;
}

if (typeof artViewer?.showModal === "function") {
  artLinks.forEach((link, index) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-label", `View ${link.querySelector("img").alt}`);
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      artOpener = link;
      showArt(index);
      artViewer.showModal();
      document.body.classList.add("art-viewer-open");
    });
  });

  document.querySelector("[data-art-previous]").addEventListener("click", () => showArt(artIndex - 1));
  document.querySelector("[data-art-next]").addEventListener("click", () => showArt(artIndex + 1));
  artViewer.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const focusable = Array.from(artViewer.querySelectorAll("button, a[href]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showArt(artIndex + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  artViewer.addEventListener("click", (event) => {
    const bounds = artViewer.getBoundingClientRect();
    if (event.target === artViewer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
      artViewer.close();
    }
  });
  artViewer.addEventListener("close", () => {
    document.body.classList.remove("art-viewer-open");
    artOpener?.focus({ preventScroll: true });
  });
}