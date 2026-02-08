import { define } from "../../utils.ts";

export default define.page(function Greet(ctx) {
  return <div>Hello {ctx.params.name}</div>;
});
