(function () {
  function wrapAngle(angle) {
    return ((angle + 180) % 360 + 360) % 360 - 180;
  }

  function initSpaceCursor() {
    const cursor = document.getElementById('spaceCursor');
    if (!cursor) return null;
    if (window.matchMedia('(pointer: coarse)').matches) {
      cursor.style.display = 'none';
      return null;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = Number(cursor.dataset.cursorSize || 46);
    const offset = size / 2;
    const positionEase = reduceMotion ? 0.4 : 0.22;
    const angleEase = reduceMotion ? 0.45 : 0.18;

    let visible = false;
    let frame = 0;
    let targetX = -offset;
    let targetY = -offset;
    let currentX = -offset;
    let currentY = -offset;
    let targetAngle = -20;
    let currentAngle = -20;

    cursor.style.willChange = 'transform, opacity';
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentAngle}deg)`;

    function render() {
      frame = 0;

      currentX += (targetX - currentX) * positionEase;
      currentY += (targetY - currentY) * positionEase;

      const delta = wrapAngle(targetAngle - currentAngle);
      currentAngle += delta * angleEase;

      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentAngle}deg)`;

      const moving =
        Math.abs(targetX - currentX) > 0.1 ||
        Math.abs(targetY - currentY) > 0.1 ||
        Math.abs(delta) > 0.1;

      if (visible || moving) {
        frame = window.requestAnimationFrame(render);
      }
    }

    function queueRender() {
      if (!frame) {
        frame = window.requestAnimationFrame(render);
      }
    }

    window.addEventListener('mousemove', (event) => {
      const dx = event.clientX - (targetX + offset);
      const dy = event.clientY - (targetY + offset);

      targetX = event.clientX - offset;
      targetY = event.clientY - offset;
      if (Math.abs(dx) + Math.abs(dy) > 0.4) {
        targetAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      }

      visible = true;
      cursor.style.opacity = '1';
      queueRender();
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      visible = false;
      cursor.style.opacity = '0';
      queueRender();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        visible = false;
        cursor.style.opacity = '0';
      }
    });

    return { queueRender };
  }

  window.SkyFolkUi = window.SkyFolkUi || {};
  window.SkyFolkUi.initSpaceCursor = initSpaceCursor;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpaceCursor, { once: true });
  } else {
    initSpaceCursor();
  }
})();
