import mediaItems from "./packages/signalwerk.cms/src/components/types/mediaItems.jsx";
import image from "./packages/signalwerk.cms/src/components/types/image.jsx";
import page from "./packages/signalwerk.cms/src/components/types/page.jsx";
import text from "./packages/signalwerk.cms/src/components/types/text.jsx";
import markdown from "./packages/signalwerk.cms/src/components/types/markdown.jsx";
import gridItem from "./packages/signalwerk.cms/src/components/types/gridItem.jsx";
import grid from "./packages/signalwerk.cms/src/components/types/grid.jsx";
import box from "./packages/signalwerk.cms/src/components/types/box.jsx";
import overview from "./packages/signalwerk.cms/src/components/types/overview.jsx";

export default {
  components: {
    mediaItems,
    image,
    page,
    text,
    markdown,
    gridItem,
    grid,
    box,
    overview,
  },
  content: {
    base: "pages",
    pattern: "**/*.{json,md}",
  },
};
