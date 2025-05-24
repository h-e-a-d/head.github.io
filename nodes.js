const SVG_NS = 'http://www.w3.org/2000/svg';
export class NodeManager {
  constructor(svg) {
    this.svg = svg;
    this.nodes = new Map();
    this.radius = 30;
    this.offset = 50;
  }
  add(data) {
    const group = document.createElementNS(SVG_NS, 'g');
    const x = this.offset + (this.nodes.size * this.radius * 2);
    const y = this.offset;
    group.setAttribute('transform', `translate(${x},${y})`);
    group.dataset.id = data.id;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', this.radius);
    circle.classList.add('person');
    group.appendChild(circle);

    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = data.name;
    text.setAttribute('dy', this.radius + 15);
    text.setAttribute('text-anchor', 'middle');
    group.appendChild(text);

    this.svg.appendChild(group);
    this.nodes.set(data.id, { data, group, x, y });
  }
  update(data) {
    const node = this.nodes.get(data.id);
    if (!node) return;
    node.data = data;
    const text = node.group.querySelector('text');
    text.textContent = data.name;
  }
  get(id) {
    const node = this.nodes.get(id);
    return node ? node.data : null;
  }
  getTree() {
    return [...this.nodes.values()].map(n => n.data);
  }
  loadTree(nodes) {
    nodes.forEach(n => this.add(n));
  }
  getPosition(id) {
    const node = this.nodes.get(id);
    if (!node) return null;
    return node.group.getCTM().translate(0, 0);
  }
  zoomToFit() {
    const bbox = this.svg.getBBox();
    const pad = 40;
    const x = bbox.x - pad;
    const y = bbox.y - pad;
    const width = bbox.width + pad * 2;
    const height = bbox.height + pad * 2;
    this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }
}
