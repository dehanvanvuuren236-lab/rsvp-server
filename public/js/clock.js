$(document).ready(function () {
  let clock;

  // ✅ Grab the current date
  const currentDate = new Date();

  // ✅ Correct timezone for South Africa
  const targetDate = moment.tz("2026-05-16 15:00", "Africa/Johannesburg");

  // ✅ Calculate time difference in seconds
  const diff = targetDate.unix() - moment(currentDate).unix();

  // ✅ Initialize FlipClock
  if (diff <= 0) {
    $(".clock").FlipClock(0, {
      clockFace: "DailyCounter",
      countdown: true,
      autoStart: false
    });
    console.log("Date has already passed!");
  } else {
    clock = $(".clock").FlipClock(diff, {
      clockFace: "DailyCounter",
      countdown: true,
      autoStart: true,
      callbacks: {
        stop: function () {
          console.log("Timer has ended!");
        }
      }
    });

    // ✅ Keep it from going negative
    setInterval(() => {
      if (clock.getTime() <= 0) {
        clock.setTime(0);
        clock.stop();
      }
    }, 1000);
  }
});
