var global = Function("return this;")();
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// pakmanager:ng-clamp
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  (function (angular) {
    
      var clampFactory = function() {
        /**
         * Clamps a text node.
         * @param {HTMLElement} element. Element containing the text node to clamp.
         * @param {Object} options. Options to pass to the clamper.
         */
        function clamp(element, options) {
          options = options || {};
    
          var self = this,
            win = window,
            opt = {
              clamp: options.clamp || 2,
              useNativeClamp: typeof(options.useNativeClamp) != 'undefined' ? options.useNativeClamp : true,
              splitOnChars: options.splitOnChars || ['.', '-', '–', '—', ' '], //Split on sentences (periods), hypens, en-dashes, em-dashes, and words (spaces).
              animate: options.animate || false,
              truncationChar: options.truncationChar || '…',
              truncationHTML: options.truncationHTML
            },
    
            sty = element.style,
            originalText = element.innerHTML,
    
            supportsNativeClamp = typeof(element.style.webkitLineClamp) != 'undefined',
            clampValue = opt.clamp,
            isCSSValue = clampValue.indexOf && (clampValue.indexOf('px') > -1 || clampValue.indexOf('em') > -1),
            truncationHTMLContainer;
    
          if (opt.truncationHTML) {
            truncationHTMLContainer = document.createElement('span');
            truncationHTMLContainer.innerHTML = opt.truncationHTML;
          }
    
    
          // UTILITY FUNCTIONS __________________________________________________________
    
          /**
           * Return the current style for an element.
           * @param {HTMLElement} elem The element to compute.
           * @param {string} prop The style property.
           * @returns {number}
           */
          function computeStyle(elem, prop) {
            if (!win.getComputedStyle) {
              win.getComputedStyle = function(el, pseudo) {
                this.el = el;
                this.getPropertyValue = function(prop) {
                  var re = /(\-([a-z]){1})/g;
                  if (prop == 'float') prop = 'styleFloat';
                  if (re.test(prop)) {
                    prop = prop.replace(re, function() {
                      return arguments[2].toUpperCase();
                    });
                  }
                  return el.currentStyle && el.currentStyle[prop] ? el.currentStyle[prop] : null;
                };
                return this;
              };
            }
    
            return win.getComputedStyle(elem, null).getPropertyValue(prop);
          }
    
          /**
           * Returns the maximum number of lines of text that should be rendered based
           * on the current height of the element and the line-height of the text.
           */
          function getMaxLines(height) {
            var availHeight = height || element.clientHeight,
              lineHeight = getLineHeight(element);
    
            return Math.max(Math.floor(availHeight / lineHeight), 0);
          }
    
          /**
           * Returns the maximum height a given element should have based on the line-
           * height of the text and the given clamp value.
           */
          function getMaxHeight(clmp) {
            var lineHeight = getLineHeight(element);
            return lineHeight * clmp;
          }
    
          /**
           * Returns the line-height of an element as an integer.
           */
          function getLineHeight(elem) {
            var lh = computeStyle(elem, 'line-height');
            if (lh == 'normal') {
              // Normal line heights vary from browser to browser. The spec recommends
              // a value between 1.0 and 1.2 of the font size. Using 1.1 to split the diff.
              lh = parseInt(computeStyle(elem, 'font-size')) * 1.2;
            }
            return parseInt(lh);
          }
    
    
          // MEAT AND POTATOES (MMMM, POTATOES...) ______________________________________
          var splitOnChars = opt.splitOnChars.slice(0),
            splitChar = splitOnChars[0],
            chunks,
            lastChunk;
    
          /**
           * Gets an element's last child. That may be another node or a node's contents.
           */
          function getLastChild(elem) {
            //Current element has children, need to go deeper and get last child as a text node
            if (elem.lastChild.children && elem.lastChild.children.length > 0) {
              return getLastChild(Array.prototype.slice.call(elem.children).pop());
            }
            //This is the absolute last child, a text node, but something's wrong with it. Remove it and keep trying
            else if (!elem.lastChild || !elem.lastChild.nodeValue || elem.lastChild.nodeValue === '' || elem.lastChild.nodeValue == opt.truncationChar) {
              elem.lastChild.parentNode.removeChild(elem.lastChild);
              return getLastChild(element);
            }
            //This is the last child we want, return it
            else {
              return elem.lastChild;
            }
          }
    
          /**
           * Removes one character at a time from the text until its width or
           * height is beneath the passed-in max param.
           */
          function truncate(target, maxHeight) {
            if (!maxHeight) {
              return;
            }
    
            /**
             * Resets global variables.
             */
            function reset() {
              splitOnChars = opt.splitOnChars.slice(0);
              splitChar = splitOnChars[0];
              chunks = null;
              lastChunk = null;
            }
    
            var nodeValue = target.nodeValue.replace(opt.truncationChar, '');
    
            //Grab the next chunks
            if (!chunks) {
              //If there are more characters to try, grab the next one
              if (splitOnChars.length > 0) {
                splitChar = splitOnChars.shift();
              }
              //No characters to chunk by. Go character-by-character
              else {
                splitChar = '';
              }
    
              chunks = nodeValue.split(splitChar);
            }
    
            //If there are chunks left to remove, remove the last one and see if
            // the nodeValue fits.
            if (chunks.length > 1) {
              // console.log('chunks', chunks);
              lastChunk = chunks.pop();
              // console.log('lastChunk', lastChunk);
              applyEllipsis(target, chunks.join(splitChar));
            }
            //No more chunks can be removed using this character
            else {
              chunks = null;
            }
    
            //Insert the custom HTML before the truncation character
            if (truncationHTMLContainer) {
              target.nodeValue = target.nodeValue.replace(opt.truncationChar, '');
              element.innerHTML = target.nodeValue + ' ' + truncationHTMLContainer.innerHTML + opt.truncationChar;
            }
    
            //Search produced valid chunks
            if (chunks) {
              //It fits
              if (element.clientHeight <= maxHeight) {
                //There's still more characters to try splitting on, not quite done yet
                if (splitOnChars.length >= 0 && splitChar !== '') {
                  applyEllipsis(target, chunks.join(splitChar) + splitChar + lastChunk);
                  chunks = null;
                }
                //Finished!
                else {
                  return element.innerHTML;
                }
              }
            }
            //No valid chunks produced
            else {
              //No valid chunks even when splitting by letter, time to move
              //on to the next node
              if (splitChar === '') {
                applyEllipsis(target, '');
                target = getLastChild(element);
    
                reset();
              }
            }
    
            //If you get here it means still too big, let's keep truncating
            if (opt.animate) {
              setTimeout(function() {
                truncate(target, maxHeight);
              }, opt.animate === true ? 10 : opt.animate);
            } else {
              return truncate(target, maxHeight);
            }
          }
    
          function applyEllipsis(elem, str) {
            elem.nodeValue = str + opt.truncationChar;
          }
    
    
          // CONSTRUCTOR ________________________________________________________________
    
          if (clampValue == 'auto') {
            clampValue = getMaxLines();
          } else if (isCSSValue) {
            clampValue = getMaxLines(parseInt(clampValue));
          }
    
          var clampedText;
          if (supportsNativeClamp && opt.useNativeClamp) {
            sty.overflow = 'hidden';
            sty.textOverflow = 'ellipsis';
            sty.webkitBoxOrient = 'vertical';
            sty.display = '-webkit-box';
            sty.webkitLineClamp = clampValue;
    
            if (isCSSValue) {
              sty.height = opt.clamp + 'px';
            }
          } else {
            var height = getMaxHeight(clampValue);
            if (height <= element.clientHeight) {
              clampedText = truncate(getLastChild(element), height);
            }
          }
    
          return {
            'original': originalText,
            'clamped': clampedText
          };
        }
    
        return clamp;
      };
    
      var ngClampFactory = function(angular, clamp) {
        angular
          .module('ng-clamp', [])
          .directive('clamp', clampDirective);
    
        clampDirective.$inject = ['$timeout'];
        function clampDirective($timeout) {
          var directive = {
              restrict: 'A',
              link: linkDirective
            },
            defaultConfig = {
              clamp: 3
            };
    
          return directive;
    
          function linkDirective(scope, element, attrs) {
            $timeout(function() {
              clamp(element[0], angular.copy(defaultConfig, attrs.config));
            });
          }
        }
        return;
      };
    
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = ngClampFactory(require('angular'), clampFactory());
      }
      else {
        ngClampFactory(angular, clampFactory());
      }
    }(angular));
    
  provide("ng-clamp", module.exports);
}(global));