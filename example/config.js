(function(){
  window.requireConfig = {
    paths : {
      "easeljs" : "//code.createjs.com/1.0.0/easeljs.min",
      "svg-arc-to-cubic-bezier" : "//unpkg.com/svg-arc-to-cubic-bezier@3.1.2/dist/svg-points-to-cubic-bezier.min",
      "easeljs-svg-path" : '../src/UtilsSVG'
    },

    shim : {
      'easeljs' :{
        exports : 'createjs'
      }
    }
  };
})();