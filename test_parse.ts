import { MarkItDown } from "markitdown-ts";
const markitdown = new MarkItDown();
async function test() {
  const result = await markitdown.convert("https://arxiv.org/pdf/2308.08155v2.pdf");
  if (result) console.log(result.markdown.substring(0, 100));
}
test();
