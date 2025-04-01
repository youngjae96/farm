document.addEventListener("DOMContentLoaded", () => {
  const plots = document.querySelectorAll(".plot.growing");

  plots.forEach((plot) => {
    const timeLeft = parseInt(plot.dataset.timeleft, 10);
    const countdownEl = plot.querySelector(".countdown");

    if (!countdownEl || isNaN(timeLeft)) return;

    let remaining = timeLeft;

    const updateTime = () => {
      if (remaining <= 0) {
        countdownEl.innerText = "수확 가능!";
        plot.classList.remove("growing");
        plot.classList.add("grown");
        return;
      }

      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      countdownEl.innerText = `${min}분 ${sec}초`;
      remaining -= 1000;
    };

    updateTime();
    setInterval(updateTime, 1000);
  });
});
