var loadModule = require('hunspell-asm').loadModule;
var fs = require('fs');

var path = require('path');
var base = path.dirname(require.resolve('dictionary-hu'));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory)
  } else if (typeof exports === 'object') {
    /**
     * Node. Does not work with strict CommonJS, but
     * only CommonJS-like environments that support module.exports,
     * like Node.
     */
    module.exports = factory()
  } else {
    // Browser globals (root is window)
    factory()(root.lunr);
  }
}(this, async function () {  
    
  var hunspellFactory = await loadModule()
  
  const getFile = function (fileName) {
    const file = fs.readFileSync(path.join(base, fileName));
    const buffer = new Uint8Array(file);
    return hunspellFactory.mountBuffer(buffer, fileName);  
  }
  
  const affFile = getFile('index.aff');  
  const dictFile = getFile('index.dic');   

  var hunspell = hunspellFactory.create(affFile, dictFile);

  console.log('hunspell loaded');

  /**
   * Just return a value to define the module export.
   * This example returns an object, but the module
   * can return a function as the exported value.
   */
  return function (lunr) {
    /* throw error if lunr is not yet included */
    if ('undefined' === typeof lunr) {
      throw new Error('Lunr is not present. Please include / require Lunr before this script.');
    }

    /* throw error if lunr stemmer support is not yet included */
    if ('undefined' === typeof lunr.stemmerSupport) {
      throw new Error('Lunr stemmer support is not present. Please include / require Lunr stemmer support before this script.');
    }

    /* register specific locale function */
    lunr.hu = function () {
      this.pipeline.reset();
      this.pipeline.add(
        lunr.hu.trimmer,
        lunr.hu.stopWordFilter,
        lunr.hu.stemmer
      );

      // for lunr version 2
      // this is necessary so that every searched word is also stemmed before
      // in lunr <= 1 this is not needed, as it is done using the normal pipeline
      if (this.searchPipeline) {
        this.searchPipeline.reset();
        this.searchPipeline.add(lunr.hu.stemmer)
      }
    };

    /* lunr trimmer function */
    lunr.hu.wordCharacters = "A-Za-z\xAA\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02B8\u02E0-\u02E4\u1D00-\u1D25\u1D2C-\u1D5C\u1D62-\u1D65\u1D6B-\u1D77\u1D79-\u1DBE\u1E00-\u1EFF\u2071\u207F\u2090-\u209C\u212A\u212B\u2132\u214E\u2160-\u2188\u2C60-\u2C7F\uA722-\uA787\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA7FF\uAB30-\uAB5A\uAB5C-\uAB64\uFB00-\uFB06\uFF21-\uFF3A\uFF41-\uFF5A";
    lunr.hu.trimmer = lunr.trimmerSupport.generateTrimmer(lunr.hu.wordCharacters);

    lunr.Pipeline.registerFunction(lunr.hu.trimmer, 'trimmer-hu');

    /* lunr stemmer function */
    lunr.hu.stemmer = (function () {
      /* create the wrapped stemmer object */
      var
        SnowballProgram = lunr.stemmerSupport.SnowballProgram,
        sbp = new SnowballProgram(),
        st = new function HungarianStemmer() {
          this.setCurrent = function (word) {
            sbp.setCurrent(word);
          };

          this.getCurrent = function () {
            return sbp.getCurrent();
          };

          this.stem = function () {
            const word = sbp.getCurrent();

            const stemmedWords = hunspell.stem(word);

            let resultWord = word;

            if (stemmedWords.length > 0) {
              resultWord = stemmedWords[0];
              console.log(word, stemmedWords.join(' '))
            }
            else {
              console.log("NOT STEMMED", word)
            }

            sbp.setCurrent(resultWord);

            return true
          };
        };

      /* and return a function that stems a word for the current locale */
      return function (token) {
        // for lunr version 2
        if (typeof token.update === "function") {
          return token.update(function (word) {
            st.setCurrent(word);
            st.stem();
            return st.getCurrent();
          })
        } else { // for lunr version <= 1
          st.setCurrent(token);
          st.stem();
          return st.getCurrent();
        }
      }
    })();

    lunr.Pipeline.registerFunction(lunr.hu.stemmer, 'stemmer-hu');

    lunr.hu.stopWordFilter = lunr.generateStopWordFilter('a abban ahhoz ahogy ahol aki akik akkor alatt amely amelyek amelyekben amelyeket amelyet amelynek ami amikor amit amolyan amíg annak arra arról az azok azon azonban azt aztán azután azzal azért be belül benne bár cikk cikkek cikkeket csak de e ebben eddig egy egyes egyetlen egyik egyre egyéb egész ehhez ekkor el ellen elsõ elég elõ elõször elõtt emilyen ennek erre ez ezek ezen ezt ezzel ezért fel felé hanem hiszen hogy hogyan igen ill ill. illetve ilyen ilyenkor ismét ison itt jobban jó jól kell kellett keressünk keresztül ki kívül között közül legalább legyen lehet lehetett lenne lenni lesz lett maga magát majd majd meg mellett mely melyek mert mi mikor milyen minden mindenki mindent mindig mint mintha mit mivel miért most már más másik még míg nagy nagyobb nagyon ne nekem neki nem nincs néha néhány nélkül olyan ott pedig persze rá s saját sem semmi sok sokat sokkal szemben szerint szinte számára talán tehát teljes tovább továbbá több ugyanis utolsó után utána vagy vagyis vagyok valaki valami valamint való van vannak vele vissza viszont volna volt voltak voltam voltunk által általában át én éppen és így õ õk õket össze úgy új újabb újra'.split(' '));

    lunr.Pipeline.registerFunction(lunr.hu.stopWordFilter, 'stopWordFilter-hu');
  };
}))

