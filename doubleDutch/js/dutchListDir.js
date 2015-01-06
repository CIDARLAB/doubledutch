app.directive('dutchList', function () {
   return {
      restrict: "E",
      replace: true,
      compile: function (element, attrs) {
         var html = "<ol class='simple_with_animation vertical'>" + element.html() + "</ol>";
         element.replaceWith($(html));
         return function (scope, element, attrs, controller) {
            var origin;
            var dropStatus = true;
            if ('drop' in attrs) {
               dropStatus = scope.$eval(attrs.drop);
            }
            element.sortable({
               group: 'dutch',
               pullPlaceholder: false,
               handle: 'i.icon-move',
               drop: dropStatus,
               onDrop: function (item, container, _super) {
                   _super(item);
                  if (container == origin && !container.options.drop) {
                     container.el[0].removeChild(item[0]);
                  }
               },
               onDragStart: function (item, container, _super) {
                  origin = container;
                  if (!container.options.drop)
                     item.clone().insertAfter(item);
                  _super(item);
               }
            });
         };
      }
   };
});