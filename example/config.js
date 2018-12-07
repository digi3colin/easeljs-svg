(function(){
  window.requireConfig = {
    paths : {
      "easeljs" : "//code.createjs.com/1.0.0/easeljs.min",
      "easeljs-svg-path" : '../src/easeljs-svg-path',
    },

    shim : {
      'easeljs' :{
        exports : 'createjs'
      }
    }
  };
})();