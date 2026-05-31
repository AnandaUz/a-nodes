export default {
  stopEvent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  },
};
