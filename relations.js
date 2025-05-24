const SVG_NS_LINE = 'http://www.w3.org/2000/svg';
export class RelationManager {
  constructor(svg, nodeManager) {
    this.svg = svg;
    this.nodes = nodeManager;
    this.relations = [];
  }
  connect(a, b) {
    const posA = this.nodes.getPosition(a);
    const posB = this.nodes.getPosition(b);
    if (!posA || !posB) return;
    const line = document.createElementNS(SVG_NS_LINE, 'line');
    line.setAttribute('x1', posA.e);
    line.setAttribute('y1', posA.f);
    line.setAttribute('x2', posB.e);
    line.setAttribute('y2', posB.f);
    line.classList.add('relation');
    line.dataset.from = a;
    line.dataset.to = b;
    this.svg.insertBefore(line, this.svg.firstChild);
    this.relations.push({ from: a, to: b });
  }
  getAll() {
    return [...this.relations];
  }
  loadTree(relations) {
    relations.forEach(r => this.connect(r.from, r.to));
  }
}
