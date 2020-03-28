// tslint:disable-next-line: no-implicit-dependencies
import 'es6-promise/auto';
// tslint:disable-next-line: no-implicit-dependencies
import 'whatwg-fetch';

// Vanilla JS after prototype
((arr) => {
  arr.forEach((item) => {
    if (item.hasOwnProperty('after')) {
      return;
    }
    Object.defineProperty(item, 'after', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: (...args) => {
        const docFrag = document.createDocumentFragment();
        args.forEach((argItem) => {
          const isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });
        this.parentNode.insertBefore(docFrag, this.nextSibling);
      }
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
