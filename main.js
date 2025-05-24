import { UI } from './ui.js';
import { Storage } from './storage.js';
import { NodeManager } from './nodes.js';
import { RelationManager } from './relations.js';

window.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('svgArea');
  const nodes = new NodeManager(svg);
  const relations = new RelationManager(svg, nodes);
  UI.init({
    svg,
    nodes,
    relations,
    onTreeChange: () => {
      const tree = { nodes: nodes.getTree(), relations: relations.getAll() };
      Storage.save(tree);
    }
  });
  const saved = Storage.load();
  if (saved) {
    nodes.loadTree(saved.nodes);
    relations.loadTree(saved.relations);
  }
});
