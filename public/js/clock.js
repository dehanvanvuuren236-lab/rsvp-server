$(document).ready(function () {
  const targetDate = moment.tz("2026-05-16 15:00", "Africa/Johannesburg");
  const now = moment();
  let diff = targetDate.unix() - now.unix();
  if (diff < 0) diff = 0;

  const clock = $(".clock").FlipClock(diff, {
    clockFace: "DailyCounter",
    countdown: true,
    autoStart: true,
    callbacks: {
      start: function () {
        console.log("⏳ Countdown started!");
      },
      stop: function () {
        console.log("✅ Countdown finished!");
      }
    }
  });

  const timerCheck = setInterval(() => {
    if (clock.getTime().time <= 0) {
      clock.setTime(0);
      clock.stop();
      clearInterval(timerCheck);
    }
  }, 1000);
});
