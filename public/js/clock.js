$(document).ready(function () {
  // Current date/time
  const currentDate = moment();

  // Target date in South Africa timezone
  const targetDate = moment.tz("2026-05-16 15:00", "Africa/Johannesburg");

  // Time difference in seconds
  const diff = targetDate.unix() - currentDate.unix();

  let clock;

  if (diff <= 0) {
    // If date already passed
    clock = $(".clock").FlipClock(0, {
      clockFace: "DailyCounter",
      countdown: true,
      autoStart: false
    });
    console.log("Date has already passed!");
  } else {
    // Initialize countdown
    clock = $(".clock").FlipClock(diff, {
      clockFace: "DailyCounter",
      countdown: true,
      autoStart: true,
      callbacks: {
        stop: function () {
          console.log("⏰ Countdown finished!");
        }
      }
    });

    // Prevent negative numbers
    setInterval(() => {
      if (clock.getTime() <= 0) {
        clock.setTime(0);
        clock.stop();
      }
    }, 1000);
  }
});
