/* Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import * as Stopwatch from "./player/Stopwatch";
import {toArray} from "./utils";

var links;
var previewIframes = {
    current: null,
    next: null,
    previous: null
};
var delayedUpdate;
var windowOpener;

// Use postMessage to safely communicate with the base document without same
// origin policy complaints
function pm(data, winRef) {
    var json = JSON.stringify(data);
    winRef.postMessage(json, '*');
    if (winRef == windowOpener) {
        // Preview transitions etc.
        previewIframes.current.postMessage(json, '*');
    }
}

function init(data) {
    Stopwatch.init(data.startTime);

    windowOpener = parent.window.opener;
    // Set up all clickable elements
    document.querySelector(".clickable").onclick = function() {
        pm({action: 'moveToNext'}, windowOpener);
    };
    document.querySelector(".clickable").oncontextmenu = function() {
        pm({action: 'moveToPrevious'}, windowOpener);
        return false;
    };
    document.querySelector("#sozi-preview-next-frame .sozi-invisible-layer").onclick = function() {
        pm({action: 'moveToNext'}, windowOpener);
    };
    document.querySelector("#sozi-preview-previous-frame .sozi-invisible-layer").onclick = function() {
        pm({action: 'moveToPrevious'}, windowOpener);
    };

    // Set the correct url in all preview iframes
    for (var state in previewIframes) {
        previewIframes[state] = document.querySelector("#sozi-preview-" + state + "-frame iframe");
        previewIframes[state].src = data.url.replace(/#[^\/].*/, "#sozi-preview");
        previewIframes[state] = previewIframes[state].contentWindow;
    }
    delayedUpdate = setTimeout(updateIframes, 1000, data);

    // Set links in frame list
    links = toArray(document.querySelectorAll(".sozi-frame-list li a"));
    links.forEach(link => {
        link.addEventListener("click", evt => {
            if (evt.button === 0) {
                var index = parseInt(link.dataset.frameIndex);
                pm({
                    action: 'moveToFrame',
                    frame: index
                }, windowOpener);
                evt.preventDefault();
            }
        });
    });

    // Bind options
    document.querySelector("#sozi-options-toggle-previous-frame").onclick = function() {
        if (this.checked) {
            document.querySelector("#sozi-preview-previous-container").style.display = "block";
            document.querySelector("#sozi-preview-next-container").style.width = "50%";
        }
        else {
            document.querySelector("#sozi-preview-previous-container").style.display = "none";
            document.querySelector("#sozi-preview-next-container").style.width = "100%";
        }
    };
    document.querySelector("#sozi-options-font-size").onchange = function() {
        document.querySelector("#sozi-notes").style.fontSize = this.value * 2 + '%';
    };

    document.getElementById("sozi-notes").innerHTML = data.notes;
}

// Update the current, previous and next preview to the corresponsing frames
function updateIframes(data) {
    for (var state in previewIframes) {
        pm({
            action: 'jumpToFrame',
            frame: data[state + 'FrameIndex']
        }, previewIframes[state]);
    }
}

// Catch key presses and forward to the base document
window.addEventListener("keydown", function (ev) {
    pm({
        action: 'keydown',
        keyCode: ev.keyCode,
        shiftKey: ev.shiftKey
    }, windowOpener);
}, false);

window.addEventListener("keypress", function (ev) {
    pm({
        action: 'keypress',
        keyCode: ev.charCode || ev.which,
        shiftKey: ev.shiftKey
    }, windowOpener);
}, false);

// Listen for messages from the base document
window.addEventListener("message", function (event) {
    var data = JSON.parse(event.data);
    if (data.action == "frameChange") {
        links.forEach(link => {
            link.className = parseInt(link.dataset.frameIndex) === data.currentFrameIndex ?
                "current" :
                "";
        });
        updateIframes(data);
        document.getElementById("sozi-notes").innerHTML = data.notes;
    }
    else if (data.action == "init") {
        init(data);
    }
}, false);
