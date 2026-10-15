(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("challenge-data").textContent);
  const ui = data.ui;
  const challenge = data.challenge;
  let selected = [];
  const buttons = [...document.querySelectorAll("button[data-option]")];
  const check = document.getElementById("check");
  const feedback = document.getElementById("feedback");
  const format = new Intl.NumberFormat(data.language);
  const update = () => {
    for (const button of buttons) {
      const position = selected.indexOf(button.dataset.option);
      button.setAttribute("aria-pressed", String(position >= 0));
      const label = data.copy.options[button.dataset.option];
      button.setAttribute("aria-label", position >= 0 && challenge.kind === "sequence" ? label + ", " + ui.sequence_position.replace("{number}", format.format(position + 1)) : label);
      button.querySelector(".number").textContent = position >= 0 ? (challenge.kind === "sequence" ? format.format(position + 1) : "✓") : "";
    }
    check.disabled = selected.length !== (challenge.kind === "sequence" ? 3 : 1);
    document.getElementById("clear").disabled = !selected.length;
  };
  for (const button of buttons) button.addEventListener("click", () => {
    const id = button.dataset.option;
    if (challenge.kind === "observation") selected = [id];
    else selected = selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
    feedback.textContent = "";
    update();
  });
  const explain = () => {
    document.getElementById("play").hidden = true;
    document.getElementById("understand").hidden = false;
    document.getElementById("explanation-heading").focus();
  };
  check.addEventListener("click", () => {
    if (selected.length === challenge.answerIDs.length && selected.every((id,index) => id === challenge.answerIDs[index])) explain();
    else feedback.textContent = ui.try_again_feedback;
  });
  document.getElementById("clear").addEventListener("click", () => { selected = [];feedback.textContent = "";update(); });
  document.getElementById("reveal").addEventListener("click", explain);
  document.getElementById("finish").addEventListener("click", () => {
    document.getElementById("understand").hidden = true;
    document.getElementById("complete").hidden = false;
    document.getElementById("complete-heading").focus();
  });
  document.getElementById("replay").addEventListener("click", () => {
    selected = [];feedback.textContent = "";update();
    document.getElementById("complete").hidden = true;
    document.getElementById("play").hidden = false;
    document.getElementById("question").focus();
  });
  update();
})();