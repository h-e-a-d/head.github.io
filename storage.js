export const Storage = {
  KEY: 'familyTree',
  save(tree) {
    localStorage.setItem(this.KEY, JSON.stringify(tree));
  },
  load() {
    const json = localStorage.getItem(this.KEY);
    return json ? JSON.parse(json) : null;
  }
};
