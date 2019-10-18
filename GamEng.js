YUI.add('game_GamEng', function(Y) {
 
    Y.namespace('game');
    Y.Event.define("arrow", {
        // Webkit and IE repeat keydown when you hold down arrow keys.
        // Opera links keypress to page scroll; others keydown.
        // Firefox prevents page scroll via preventDefault() on either
        // keydown or keypress.
        _event: (Y.UA.webkit || Y.UA.ie) ? 'keydown' : 'keypress',
     
        _keys: {
            '37': 'left',
            '38': 'up',
            '39': 'right',
            '40': 'down'
        },
     
        _keyHandler: function (e, notifier) {
            if (this._keys[e.keyCode]) {
                e.direction = this._keys[e.keyCode];
                notifier.fire(e);
            }
        },
     
        on: function (node, sub, notifier) {
            // Use the extended subscription signature to set the 'this' object
            // in the callback and pass the notifier as a second parameter to
            // _keyHandler
            sub._detacher = node.on(this._event, this._keyHandler,
                                    this, notifier);
        },
     
        detach: function (node, sub, notifier) {
            sub._detacher.detach();
        },
     
        // Note the delegate handler receives a fourth parameter, the filter
        // passed (e.g.) container.delegate('click', callback, '.HERE');
        // The filter could be either a string or a function.
        delegate: function (node, sub, notifier, filter) {
            sub._delegateDetacher = node.delegate(this._event, this._keyHandler,
                                                  filter, this, notifier);
        },
     
        // Delegate uses a separate detach function to facilitate undoing more
        // complex wiring created in the delegate logic above.  Not needed here.
        detachDelegate: function (node, sub, notifier) {
            sub._delegateDetacher.detach();
        }
    });
    Y.game.btree = function (obj) {
        this.left = null;
        this.base = obj;
        this.right = null;
    };
    Y.game.GamEng = function(canvas) {
        //this.canvass = [];
        this.currentCanvas = canvas;
        this.canvasCtx = null;
        this.gameobj = [];
        this.Y = Y;
        this.objOrder = 1;
        this.propCount = 0;
        this.propObjects = [];
        this.propObject = null;
        this.clickSubscribers = [];
        this.keyBoardSubscribers = [];
        this.arrowKeySubscribers = [];
    };
    Y.mix(Y.game.GamEng.prototype, {
        init: function (width, height) {
            //this.currentCanvas = this.canvass[0];
            var ccanvas = this.currentCanvas;
            ccanvas.set('width', width);
            ccanvas.set('height', height);
            this.canvasCtx = this.Y.Node.getDOMNode(ccanvas).getContext('2d');
            ccanvas.on('click', this.clickHandler, this);
            ccanvas.on('keyup', this.keyBoardHandlerUp, this);
            ccanvas.on('keydown', this.keyBoardHandlerDown, this);
            ccanvas.on('arrow', this.arrowKeysHandler, this);
        },
        placeProp: function (propObject, obj) {
            var prop = new Y.game.btree(obj);
            if (!propObject) {
                propObject = prop;
            } else if (propObject.base.x >= obj.x) {
                if (!propObject.right) {
                    propObject.right = prop;
                } else {
                    propObject.right = this.placeProp(propObject.right, obj);
                }
            } else {
                if (!propObject.left) {
                    propObject.left = prop;
                } else {
                    propObject.left = this.placeProp(propObject.left, obj);
                }
            }
            return propObject;
        },
        searchObjInPos: function (propObject, x, y) {
            var base = propObject.base;
            Y.log('x.y: ' + base.x + '.' + base.y);
            if (base.x <= x && (base.x + base.width) >= x) {
                if (base.y <= y && (base.y + base.height) >= y) {
                    return base;
                }
            }
            if (base.x >= x) {
                if (propObject.left) {
                    return this.searchObjInPos(propObject.left, x, y);
                }
            }
            if ((base.x + base.width) <= x) {
                if (propObject.left) {
                    return this.searchObjInPos(propObject.left, x, y);
                }
            }
            Y.log('test');
            return null;
        },
        arrowKeysHandler: function (e) {
            var arrowKeySubscribers = this.arrowKeySubscribers,
                i,
                subs;
            for (i in arrowKeySubscribers) {
                subs = arrowKeySubscribers[i];
                subs.onArrowKeys(e);
            }
        },
        keyBoardHandlerUp: function(e) {
            var keyBoardSubscribers = this.keyBoardSubscribers,
                i,
                subs;
            for (i in keyBoardSubscribers) {
                subs = keyBoardSubscribers[i];
                subs.onKeyUp(e);
            }
        },
        keyBoardHandlerDown: function(e) {
            var keyBoardSubscribers = this.keyBoardSubscribers,
                i,
                subs;
            for (i in keyBoardSubscribers) {
                subs = keyBoardSubscribers[i];
                subs.onKeyDown(e);
            }
        },
        clickHandler: function(e) {
            var clickSubscribers = this.clickSubscribers,
                i,
                x,
                y,
                subs,
                canvasRegion = this.currentCanvas.get('region');
            for (i in clickSubscribers) {
                x = e.pageX - canvasRegion.left;
                y = e.pageY - canvasRegion.top;
                subs = clickSubscribers[i];
                if (x >= subs.x && x <= (subs.x + subs.width) &&
                    y >= subs.y && y <= (subs.y + subs.height)) {
                    subs.onclick(e);
                }
            }
        },
        start: function () {
            this.currentCanvas.setStyle('visibility','visible');
        },
        addDesignerObject: function (gobj) {
            this.placeObj(gobj);
        },
        addObject: function (gobj) {
            this.placeObj(gobj);
            //this.propObjects.push(gobj);
            this.propObject = this.placeProp(this.propObject, gobj);
            if (gobj.userMouseControl) {
                this.clickSubscribers.push(gobj);
            }
            if (gobj.userKeyboardControl) {
                this.keyBoardSubscribers.push(gobj);
            }
            if (gobj.arrowKeysControl) {
                this.arrowKeySubscribers.push(gobj);
            }
        },
        placeObj: function (gobj) {
            this.place(gobj, ++this.propCount);
        },
        removeObj: function (gobj) {
            var clearBuffer = gobj.clearBuffer;
            Y.log('Removing..');
            if (clearBuffer) {
            Y.log('clearbuffer');
                this.canvasCtx.putImageData(clearBuffer, gobj.x, gobj.y);
            }
        },
        moveObj: function (gobj, lefti, topi) {
            var clearBuffer = gobj.clearBuffer,
                x = gobj.x,
                y = gobj.y,
                movX,
                movY,
                cobj = null,
                centerY;
            if ((x + lefti) >= 0 && (y + topi) >= 0) {
                if (clearBuffer) {
                    this.canvasCtx.putImageData(clearBuffer, x, y);
                }
                gobj.x = x + lefti;
                gobj.y = y + topi;
                movX = (lefti < 0) ? x : x + (gobj.width);
                movX = (lefti == 0) ? parseInt(x + (gobj.width / 2)) : movX;
                movY = (topi < 0) ? y : y + (gobj.height);
                movY = (topi == 0) ? parseInt(y + (gobj.height / 2)) : movY;
                Y.log("X.Y: " + movX + '.' + movY);
                cobj = this.searchObjInPos(this.propObject, movX, movY);
                Y.log("Obj: " + cobj);
                if (cobj) {
                    this.removeObj(cobj);
                }
                this.placeObj(gobj);
            }
        },
        place: function (gobj, order, laterNo) {
            if (this.objOrder < order) {
                if (!laterNo) {
                    laterNo = 1;
                }
                if (laterNo <= 5) {
                    this.Y.later(500, this, function () { this.place(gobj, order, ++laterNo) });
                    return;
                }
            }
            if (gobj.loaded) {
                var x = gobj.x,
                    y = gobj.y,
                    width = gobj.width,
                    height = gobj.height,
                    ctx = this.canvasCtx;
                if (width && height) {
                    if (gobj.movable) {
                        try {
                            gobj.clearBuffer = ctx.getImageData(x, y, width, height);
                        } catch (e) {
                            //do something
                        }
                    }
                    ctx.drawImage(gobj.image, x, y, width, height);
                }
                this.objOrder = order + 1;
            } else {
                gobj.on('load', function () { this.place(gobj, order) }, this);
            }
        }
    });
    Y.game.GameProp = function (Y) {
        this.name = '';
        this.width = '';
        this.height = '';
        this.bounciness = 1;
        this.solidness = -1;
        this.x = 0;
        this.y = 0;
        this.image = null;
        this.Y = Y;
        this.loaded = false;
        this.clearBuffer = '';
    }

    Y.mix(Y.game.GameProp.prototype, {
        init: function (img, x, y, width, height) {
            var image = this.image = new Image(),
                yImg;
            this.width = width;
            this.height = height;
            this.x = x;
            this.y = y;
            this.name = img;
            this.moving = false;
            image.src = img;
            Y.one(image).on('load', this.onload, this);
        },
        
        setImage: function (src) {
            //this.image = new Image();
            this.image.src = src;
        },
        onload: function(e) {
            if (!this.width) {
                this.width = e.target.get('width');
            }
            if (!this.height) {
                this.height = e.target.get('height');
            }
            this.loaded = true;
            this.fire('load', e);
        },
        selfAnimate: function() {
        
        },
        onKeyUp: function(e) {
            this.fire('keyup', e);
        },
        onKeyDown: function(e) {
            this.fire('keydown', e);
        },
        onArrowKeys: function(e) {
            this.fire('arrow', e);
        },
        onclick: function(e) {
            this.fire('click', e); 
        }
    });
    Y.augment(Y.game.GameProp, Y.EventTarget);

}, '0.1.1' /* module version */, {
    requires: ['base']
});
/*
var Canvas = function (width, height) {
    
    
}
Y.mix(Canvas.prototype, {
    init: function(width, height) {
    
    }
});*/
