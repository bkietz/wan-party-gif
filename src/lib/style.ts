export class Style {
  fillStyle = "#0000";
  strokeStyle = "#0000";
  lineWidth = 1;
  shadowColor = "#000";
  shadowBlur = 0;

  static from(props: object): Style {
    return { ...new Style(), ...props };
  }
}
