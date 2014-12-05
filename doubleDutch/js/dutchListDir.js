app.directive('dutchList', function () {
   return {
      restrict: "E",
      replace: true,
      compile: function (element, attrs) {
         var html = "<ol class='simple_with_animation vertical'>" + element.html() + "</ol>";
         element.replaceWith($(html));
         return function (scope, element, attrs, controller) {
            var adjustment;
            element.sortable({
               group: 'simple_with_animation',
               pullPlaceholder: false,
               handle: 'i.icon-move',
               // animation on drop
               onDrop: function (item, targetContainer, _super) {
                  var clonedItem = $('<li/>').css({height: 0});
                  item.before(clonedItem);
                  clonedItem.animate({'height': item.height()});
                  item.animate(clonedItem.position(), function  () {
                     clonedItem.detach();
                     _super(item);
                  });
               },
               // set item relative to cursor position
               onDragStart: function (item, container, _super) {
                  var offset = item.offset();
                  pointer = container.rootGroup.pointer;
                  adjustment = {
                     left: pointer.left - offset.left,
                     top: pointer.top - offset.top
                  };
                  _super(item, container);
               },
               onDrag: function (item, position) {
                  item.css({
                     left: position.left - adjustment.left,
                     top: position.top - adjustment.top
                  });
               }
            });
         };
      }
   };
});