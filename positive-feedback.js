(() => {
  "use strict";

  const celebration = document.querySelector("#celebration");
  const praiseLines = ["太棒了！", "答对啦！", "真厉害！", "做得真好！"];
  let streak = 0;
  let resumeMusicTimer = null;
  let celebrationTimer = null;

  function resetPositiveFeedback() {
    streak = 0;
    clearTimeout(celebrationTimer);
    if (celebration) {
      celebration.classList.remove("is-showing");
      celebration.setAttribute("aria-hidden", "true");
    }
  }

  function pauseBackgroundMusic(duration) {
    const shouldResume = Boolean(musicTimer) && state.musicOn;
    stopMusic();
    clearTimeout(resumeMusicTimer);
    if (shouldResume) {
      resumeMusicTimer = setTimeout(() => {
        if (state.musicOn && state.audioReady && !document.hidden) startMusic();
      }, duration);
    }
  }

  function playCorrectMelody() {
    ensureAudio();
    pauseBackgroundMusic(1280);
    [
      [523.25, 0.18, "triangle", 0.044, 0],
      [659.25, 0.18, "triangle", 0.044, 0.14],
      [783.99, 0.22, "triangle", 0.048, 0.28],
      [1046.5, 0.42, "sine", 0.052, 0.46],
      [523.25, 0.56, "sine", 0.016, 0.46]
    ].forEach(note => tone(...note));
  }

  function playCelebrationMelody() {
    ensureAudio();
    pauseBackgroundMusic(2920);

    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 880, 987.77, 1174.66, 1046.5, 1318.51];
    const times = [0, 0.13, 0.26, 0.43, 0.72, 0.86, 1, 1.14, 1.38, 1.62];
    melody.forEach((frequency, index) => {
      tone(frequency, index >= 8 ? 0.48 : 0.2, "triangle", index >= 8 ? 0.054 : 0.045, times[index]);
    });

    [[261.63, 0], [392, 0.43], [349.23, 0.86], [392, 1.28], [523.25, 1.62]].forEach(([frequency, when], index) => {
      tone(frequency, index === 4 ? 0.78 : 0.38, "sine", 0.019, when);
    });

    [1046.5, 1318.51, 1567.98].forEach((frequency, index) => {
      tone(frequency, 0.7, "sine", 0.018, 1.82 + index * 0.06);
    });
  }

  function showCelebration() {
    if (!celebration) return;
    clearTimeout(celebrationTimer);
    celebration.classList.remove("is-showing");
    void celebration.offsetWidth;
    celebration.classList.add("is-showing");
    celebration.setAttribute("aria-hidden", "false");

    const colors = ["#ffd151", "#ff8c7a", "#80d6bd", "#8abaf0", "#ffffff", "#d8a6ff"];
    burst(window.innerWidth / 2, window.innerHeight * 0.43, 90, colors);
    setTimeout(() => burst(window.innerWidth * 0.2, window.innerHeight * 0.55, 42, colors), 350);
    setTimeout(() => burst(window.innerWidth * 0.8, window.innerHeight * 0.55, 42, colors), 650);

    celebrationTimer = setTimeout(() => {
      celebration.classList.remove("is-showing");
      celebration.setAttribute("aria-hidden", "true");
    }, 2500);
  }

  const originalEnterScene = enterScene;
  enterScene = function enterSceneWithFeedback(key) {
    resetPositiveFeedback();
    return originalEnterScene(key);
  };

  const originalChangePage = changePage;
  changePage = function changePageWithFeedback(direction) {
    resetPositiveFeedback();
    return originalChangePage(direction);
  };

  const originalFinishRound = finishRound;
  finishRound = function finishRoundWithFeedback() {
    const completedScene = state.page === 1;
    const result = originalFinishRound();
    if (completedScene) streak = 0;
    return result;
  };

  itemClick = function itemClickWithPositiveFeedback(button) {
    if (state.locked) return;
    const index = Number(button.dataset.index);
    const item = scenes[state.scene].items[index];
    button.classList.remove("is-wrong", "is-correct", "is-inviting");
    void button.offsetWidth;

    if (state.mode === "explore") {
      state.seen.add(index);
      button.classList.add("is-seen", "is-correct");
      playSfx("tap");
      burstAt(button, 9, ["#fff7a8", "#ff9f84", "#91dbc3"]);
      speak(item[1], { slow: true });
      renderProgress();
      if (state.seen.size >= 3 && !state.quizTimer) {
        state.quizTimer = setTimeout(() => {
          state.quizTimer = null;
          startQuiz();
        }, 1050);
      }
      return;
    }

    if (index === state.target) {
      state.locked = true;
      button.classList.add("is-correct");
      state.wins += 1;
      state.stars += 1;
      streak += 1;
      localStorage.setItem("xiaowen-stars", String(state.stars));

      burstAt(button, 30, ["#ffd151", "#ff8c7a", "#80d6bd", "#8abaf0", "#ffffff"]);
      renderProgress();

      const reachedCelebration = streak % 3 === 0;
      if (reachedCelebration) {
        playCelebrationMelody();
        showCelebration();
        setTimeout(() => speak("连续答对三次，太厉害了！"), 760);
      } else {
        playCorrectMelody();
        showReward();
        const praise = praiseLines[(streak - 1) % praiseLines.length];
        setTimeout(() => speak(`${praise}这是${item[1]}`), 360);
      }

      setTimeout(() => {
        state.locked = false;
        if (state.wins >= 3) finishRound();
        else nextTarget();
      }, reachedCelebration ? 2620 : 1460);
      return;
    }

    streak = 0;
    button.classList.add("is-wrong");
    playSfx("wrong");
    speak("再试一次");
  };

  document.addEventListener("click", event => {
    if (event.target.closest('[data-action="home"]')) resetPositiveFeedback();
  }, true);
})();
