const Lang = imports.lang;
const Main = imports.ui.main;
const Layout = imports.ui.layout;
const Meta = imports.gi.Meta;

const panelBox = Main.layoutManager.panelBox;

let listeners = []
let invertedArrows = []

let oldUpdatePanelBarrier = null;

function init() {
}

function move_panel_to_bottom() {
    panelBox.set_position(0, Main.layoutManager.primaryMonitor.height - panelBox.height);
}

function remove_from_array(a, e) {
    let index = a.indexOf(e);
    if (index >= 0) {
        a.splice(index, 1);
    }
}

function invert_arrows(actor) {
    if (invertedArrows.indexOf(actor) >= 0) {
        return;
    }

    let added_listener = {
        object: actor,
        id: actor.connect('actor-added', (container, actor) => { invert_arrows(actor); })
    };
    listeners.push(added_listener);

    let destroy_listener = {
        object: actor,
        id: actor.connect('destroy', () => {
            remove_from_array(listeners, added_listener);
            remove_from_array(listeners, destroy_listener);
            remove_from_array(invertedArrows, actor);
        })
    };
    listeners.push(destroy_listener);

    if (actor.has_style_class_name && actor.has_style_class_name('popup-menu-arrow')) {
        if (actor.get_icon_name && actor.get_icon_name() == 'pan-down-symbolic') {
            actor.set_icon_name('pan-up-symbolic');
            invertedArrows.push(actor);
        }
    }

    actor.get_children().forEach(invert_arrows);
}

function update_panel_barrier() {
    if (this._rightPanelBarrier) {
        this._rightPanelBarrier.destroy();
        this._rightPanelBarrier = null;
    }

    if (this._leftPanelBarrier) {
        this._leftPanelBarrier.destroy();
        this._leftPanelBarrier = null;
    }

    if (!this.primaryMonitor)
        return;

    if (this.panelBox.height) {
        let primary = this.primaryMonitor;

        this._rightPanelBarrier = new Meta.Barrier({
            display: global.display,
            x1: primary.x + primary.width,
            y1: primary.y + this.panelBox.y,
            x2: primary.x + primary.width,
            y2: primary.y + this.panelBox.y + this.panelBox.height,
            directions: Meta.BarrierDirection.NEGATIVE_X
        });

        this._leftPanelBarrier = new Meta.Barrier({
            display: global.display,
            x1: primary.x,
            y1: primary.y + this.panelBox.y,
            x2: primary.x,
            y2: primary.y + this.panelBox.y + this.panelBox.height,
            directions: Meta.BarrierDirection.POSITIVE_X
        });
    }
}

function enable() {
    oldUpdatePanelBarrier = Main.layoutManager._updatePanelBarrier;
    Main.layoutManager._updatePanelBarrier = Lang.bind(Main.layoutManager, update_panel_barrier);

    listeners.push({
        object: global.screen,
        id: global.screen.connect("monitors-changed", move_panel_to_bottom)
    })
    listeners.push({
        object: panelBox,
        id: panelBox.connect("notify::height", move_panel_to_bottom)
    })

    move_panel_to_bottom();
    invert_arrows(panelBox);

    Main.panel._leftCorner.actor.hide();
    Main.panel._rightCorner.actor.hide();
}

function disable() {
    while (listeners.length > 0) {
        let connection = listeners.pop();
        connection.object.disconnect(connection.id);
    }

    Main.layoutManager._updatePanelBarrier = oldUpdatePanelBarrier;
    if (Main.layoutManager._leftPanelBarrier) {
        Main.layoutManager._leftPanelBarrier.destroy();
        Main.layoutManager._leftPanelBarrier = null;
    }

    panelBox.set_position(0, 0);

    while (invertedArrows.length > 0) {
        let arrow = invertedArrows.pop();
        arrow.set_icon_name('pan-down-symbolic')
    }

    Main.panel._leftCorner.actor.show();
    Main.panel._rightCorner.actor.show();
}
