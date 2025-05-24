import { v4 as uuidv4 } from 'https://jspm.dev/uuid';
export const UI = {
  init({ svg, nodes, relations, onTreeChange }) {
    this.svg = svg;
    this.nodes = nodes;
    this.relations = relations;
    this.onTreeChange = onTreeChange;
    this.connectMode = false;
    this._bindControls();
  },
  _bindControls() {
    document.getElementById('btnAdd').addEventListener('click', () => this._openForm());
    document.getElementById('btnConnect').addEventListener('click', () => this._toggleConnectMode());
    document.getElementById('btnCancel').addEventListener('click', () => this._closeForm());
    document.getElementById('nodeForm').addEventListener('submit', e => this._saveForm(e));
    document.getElementById('btnZoomFit').addEventListener('click', () => this.nodes.zoomToFit());
    this.svg.addEventListener('click', e => this._onSvgClick(e));
  },
  _toggleConnectMode() {
    this.connectMode = !this.connectMode;
    this.firstNode = null;
    document.getElementById('btnConnect').textContent = this.connectMode ? 'Cancel Connect' : 'Connect';
  },
  _onSvgClick(e) {
    const target = e.target.closest('g[data-id]');
    if (!target) return;
    const id = target.dataset.id;
    if (this.connectMode) {
      if (!this.firstNode) {
        this.firstNode = id;
      } else if (id !== this.firstNode) {
        this.relations.connect(this.firstNode, id);
        this.onTreeChange();
        this._toggleConnectMode();
      }
    } else {
      this._openForm(id);
    }
  },
  _openForm(editId = null) {
    this.editId = editId;
    const overlay = document.getElementById('nodeFormOverlay');
    const form = document.getElementById('nodeForm');
    document.getElementById('formTitle').textContent = editId ? 'Edit Person' : 'Add Person';
    form.reset();
    if (editId) {
      const data = this.nodes.get(editId);
      Object.entries(data).forEach(([k, v]) => form.elements[k].value = v || '');
    }
    overlay.classList.remove('hidden');
  },
  _closeForm() {
    document.getElementById('nodeFormOverlay').classList.add('hidden');
  },
  _saveForm(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: this.editId || uuidv4(),
      name: form.elements.name.value,
      father: form.elements.father.value,
      surname: form.elements.surname.value,
      dob: form.elements.dob.value,
      birthName: form.elements.birthName.value
    };
    if (this.editId) {
      this.nodes.update(data);
    } else {
      this.nodes.add(data);
    }
    this.onTreeChange();
    this._closeForm();
  }
};
