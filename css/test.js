var zawgyiStyleSheet = document.createElement('link');
zawgyiStyleSheet.rel = "stylesheet";
zawgyiStyleSheet.href = "https://mmwebfonts.comquas.com/fonts/?font=zawgyi";
document.head.appendChild(zawgyiStyleSheet);

var unicodeStyleSheet = document.createElement('link');
unicodeStyleSheet.rel = "stylesheet";
unicodeStyleSheet.href = "https://mmwebfonts.comquas.com/fonts/?font=pyidaungsu";
document.head.appendChild(unicodeStyleSheet);

var fontStyle = document.createElement('style');
fontStyle.type = "text/css";
var zawgyiStyleInnerText = document.createTextNode('.zgFont {font-family: "Zawgyi-One" !important;} .uniFont {font-family: "Pyidaungsu" !important;}');
fontStyle.appendChild(zawgyiStyleInnerText);
document.head.appendChild(fontStyle);

const testTextNode = document.createElement('p');
testTextNode.style.position = 'absolute';
testTextNode.style.visibility = 'hidden';
testTextNode.textContent = '\u104E'; //၎ in unicode and ၎င်း in zawgyi
testTextNode.setAttribute('id', 'testStr');

const standardTextNode = document.createElement('p');
standardTextNode.style.position = 'absolute';
standardTextNode.style.visibility = 'hidden';
standardTextNode.textContent = '\u1004'; //င in both unicode and zawgyi
standardTextNode.setAttribute('id', 'standardStr');

const zgTextNode = document.createElement('p');
zgTextNode.style.position = 'absolute';
zgTextNode.style.visibility = 'hidden';
zgTextNode.textContent = '\u104E'; //၎ in unicode and ၎င်း in zawgyi
zgTextNode.classList.add('zgFont');
zgTextNode.setAttribute('id', 'zgStr');

const uniTextNode = document.createElement('p');
uniTextNode.style.position = 'absolute';
uniTextNode.style.visibility = 'hidden';
uniTextNode.textContent = '\u104E'; //၎ in unicode and ၎င်း in zawgyi
uniTextNode.classList.add('uniFont');
uniTextNode.setAttribute('id', 'uniStr');

document.body.appendChild(testTextNode);
document.body.appendChild(standardTextNode);
document.body.appendChild(zgTextNode);
document.body.appendChild(uniTextNode);

const zawgyiDetector = new google_myanmar_tools.ZawgyiDetector();
const regexMM = new RegExp("[\u1000-\u109f\uaa60-\uaa7f]+");

const deviceFont = detectFont();
const title_font = zawgyiDetector.getZawgyiProbability(document.title) > 0.5 ? 'zawgyi' : 'unicode';

let doc_title = document.title;

if (title_font != deviceFont) {
    if (deviceFont == 'unicode') {
        doc_title = zg2uni(document.title);
    } else {
        doc_title = uni2zg(document.title);
    }
}

document.title = doc_title;

let canEmbedFont = true; //first assume that the browser can embed font
let domCompleted = false; //check for the document is completed or not
let potential_nodes = [];

/**
 * Observe changes in DOM
 */
const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
const list = document.querySelector('body');

const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.type == 'childList') {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeType == Node.TEXT_NODE) {} else {
                    tagNode(node);
                }
            }
        } else if (mutation.type == 'characterData') {
            tagNode(mutation.target);
        }
    });
});

observer.observe(list, {
    childList: true,
    attributes: false,
    characterData: true,
    subtree: true
});

if (document && document.body) tagNode(document.body);

document.onreadystatechange = function () {
    if (document.readyState == 'complete') {
        //this is when the font face rule is applied to the HTML elements
        //so we need to check here whether the device can embed font or not
        domCompleted = true;
        canEmbedFont = checkEmbedFont();

        if (!canEmbedFont) {
            for (let nodeInfo of potential_nodes) {
                if (nodeInfo.font == 'zawgyi') {
                    nodeInfo.node.textContent = Rabbit.zg2uni(nodeInfo.node.textContent);
                } else {
                    nodeInfo.node.textContent = Rabbit.uni2zg(nodeInfo.node.textContent);
                }
            }
        }

        potential_nodes = []; //clear the potential nodes
    }
}

function tagNode(node) {

    if (node.classList && (node.classList.contains('zgFont') ||
            node.classList.contains('uniFont'))) {
        return;
    }

    if (node.tagName === 'SCRIPT' || node.tagName === 'META' || node.tagName === 'LINK' || node.tagName == 'INPUT' || node.tagName == "TEXTAREA") {
        return;
    }

    //title attribute is used for tooltip
    const title = node.title;

    if (title && regexMM.test(title)) {
        const detectedFont = zawgyiDetector.getZawgyiProbability(title) > 0.5 ? 'zawgyi' : 'unicode';

        if (deviceFont != detectedFont) {

            if (detectedFont === 'zawgyi') {
                const unicodeString = Rabbit.zg2uni(title);
                node.title = unicodeString;
            } else if (detectedFont === 'unicode') {
                const zawgyiString = Rabbit.uni2zg(title);
                node.title = zawgyiString;
            }
        }
    }

    if (node.nodeType == Node.TEXT_NODE) {
        //this will disable font embedding for facebook input text
        if (node.parentNode.tagName == 'SPAN' && node.parentNode.hasAttribute('data-text') && node.parentNode.getAttribute('data-text') == 'true') {
            return;
        }

        let text = node.textContent;

        if (!regexMM.test(text)) {
            return;
        }

        if (text) {
            let prNode = node.parentNode;
            text = prNode.textContent;

            if (prNode.tagName == "OPTION") {
                //if option tag then embed font in select tag other than option tag
                prNode = prNode.parentNode;
            }

            const detectedFont = zawgyiDetector.getZawgyiProbability(text) > 0.5 ? 'zawgyi' : 'unicode';

            if (deviceFont != detectedFont) {

                if (domCompleted == false) {
                    potential_nodes.push({
                        node: prNode,
                        font: detectedFont
                    });
                }

                if (detectedFont === 'zawgyi') {
                    prNode.classList.add('zgFont');

                    if (domCompleted && !canEmbedFont) {
                        if (prNode.tagName == "SELECT") {
                            //if it's SELECT node then we need to convert every option's text
                            for (let option of prNode.options) {
                                const unicodeString = Rabbit.zg2uni(option.textContent);
                                option.textContent = unicodeString;
                            }
                        } else {
                            const unicodeString = Rabbit.zg2uni(text);
                            prNode.textContent = unicodeString;
                        }
                    }
                } else if (detectedFont === 'unicode') {
                    prNode.classList.add('uniFont');

                    if (domCompleted && !canEmbedFont) {
                        if (prNode.tagName == "SELECT") {
                            //if it's SELECT node then we need to convert every option's text
                            for (let option of prNode.options) {
                                const zawgyiString = Rabbit.uni2zg(option.textContent);
                                option.textContent = zawgyiString;
                            }
                        } else {
                            const zawgyiString = Rabbit.uni2zg(text);
                            prNode.textContent = zawgyiString;
                        }
                    }
                }
            }
        }

    } else {
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            tagNode(child);
        }
        if (doc_title != document.title) {
            document.title = doc_title;
        }
    }
}

/**
 * This function detect the font that the user device can render (zawgyi font or unicode font)
 */
function detectFont() {
    const standardWidth = document.getElementById('standardStr').clientWidth;
    const testWidth = document.getElementById('testStr').clientWidth;

    let deviceFont;

    //compare the two charater width and determine unicode or zawgyi
    if (standardWidth == testWidth || testWidth < (standardWidth * 2)) {
        deviceFont = 'unicode';
    } else {
        deviceFont = 'zawgyi';
    }
    return deviceFont;
}

function checkEmbedFont() {

    let embedFont = true;

    return embedFont;
}