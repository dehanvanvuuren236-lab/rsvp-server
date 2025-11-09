var CustomCounter = FlipClock.Face.extend({
  build: function() {
    this.createList(this.factory.getTime().time);
  },
  createList: function(time) {
    this.div = $('<ul class="flip-clock-wrapper single-number"><li><a><div class="up"><div class="inn">' + time + '</div></div><div class="down"><div class="out">' + time + '</div></div></a></li></ul>');
    this.div.appendTo(this.factory.$el);
  },
  update: function() {
    var time = this.factory.getTime().time;
    this.div.find('.inn').text(time);
    this.div.find('.out').text(time);
  }
});

$(document).ready(function () {
  const targetDate = moment.tz("2026-05-16 15:00", "Africa/Johannesburg");
  const diff = targetDate.unix() - moment().unix();

  var clock = $('.clock').FlipClock(diff, {
    clockFace: CustomCounter,
    countdown: true,
    autoStart: true
  });
});
