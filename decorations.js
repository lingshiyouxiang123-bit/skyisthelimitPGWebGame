(() => {
  "use strict";

  const createRadar = () => {
    const radar = document.createElement("div");
    radar.className = "radar-display";
    radar.innerHTML = `
      <div class="radar-container">
        <div class="radar-line"></div>
        <div class="radar-center"></div>
        <div class="radar-blip"></div>
        <div class="radar-blip"></div>
        <div class="radar-blip"></div>
      </div>
    `;
    document.body.appendChild(radar);
  };

  const createStatusLights = () => {
    const lights = document.createElement("div");
    lights.className = "status-lights";
    lights.innerHTML = `
      <div class="status-light active">
        <div class="status-light-dot"></div>
        <span>POWER</span>
      </div>
      <div class="status-light active">
        <div class="status-light-dot"></div>
        <span>COMMS</span>
      </div>
      <div class="status-light standby">
        <div class="status-light-dot"></div>
        <span>RADAR</span>
      </div>
      <div class="status-light warning">
        <div class="status-light-dot"></div>
        <span>ALERT</span>
      </div>
    `;
    document.body.appendChild(lights);
  };

  const createDataStream = () => {
    const stream = document.createElement("div");
    stream.className = "data-stream";
    for (let i = 0; i < 8; i += 1) {
      const line = document.createElement("div");
      line.className = "data-line";
      stream.appendChild(line);
    }
    document.body.appendChild(stream);
  };

  const createOrbit = () => {
    const orbit = document.createElement("div");
    orbit.className = "orbit-display";
    orbit.innerHTML = `
      <div class="orbit-ring"></div>
      <div class="orbit-ring"></div>
      <div class="orbit-ring"></div>
    `;
    document.body.appendChild(orbit);
  };

  const init = () => {
    if (window.innerWidth > 1024) {
      createRadar();
      createStatusLights();
      createDataStream();
      createOrbit();
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const decorElements = document.querySelectorAll(
          ".radar-display, .status-lights, .data-stream, .orbit-display"
        );
        if (window.innerWidth > 1024 && decorElements.length === 0) {
          createRadar();
          createStatusLights();
          createDataStream();
          createOrbit();
        } else if (window.innerWidth <= 1024 && decorElements.length > 0) {
          decorElements.forEach((el) => el.remove());
        }
      }, 250);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

