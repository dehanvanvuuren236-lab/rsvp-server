$(document).ready(function () {
  const currentDate = moment();
  const targetDate = moment.tz("2026-05-16 15:00", "Africa/Johannesburg");

  let diff = targetDate.unix() - currentDate.unix();
  if (diff < 0) diff = 0;

  const clock = $('.clock').FlipClock(diff, {
    clockFace: 'DailyCounter',
    countdown: true,
    autoStart: true,
    callbacks: {
      stop: function () {
        console.log("⏰ Countdown finished!");
      }
    }
  });

  // Force only one <li> per digit
  $('.flip-clock-wrapper ul li').each(function () {
    $(this).siblings().remove(); // remove duplicates
  });
});
