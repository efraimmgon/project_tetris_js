// ---------------------------------------------------------------------
// App Specific Helpers
// ---------------------------------------------------------------------

var game_helpers = (function() {

  // Pieces ------------------------------------------------------------

  var block = function(body, board) {
    anchor_x = random_between(0, board[0]);

    return body.map(function(xy) {
      var [x, y] = xy;
      return [x + anchor_x, y];
    });
  };

  // Starting out, imagine a board where only single, 1x1 blocks exist.
  var small_square = function(board) {
    return block([[0, 0]], board);
  };

  // Move the block ----------------------------------------------------

  var move_block = function(block, direction) {
    var sum = function(xy) {
      return map(function(a, b) { return a + b; }, direction, xy);
    };
    block.body = map(sum, block.body);
  };

  var key_code_to_move = {
    40: [0, 1], // down
    39: [1, 0], // right
    37: [-1, 0] // left
  };

  // Returns true if the snake collision with the board edges or itself
  // (the snake body) is detected
  var collisions = function(db, direction) {
    var body = db.block.body,
        [x, y] = db.board,
        border_x = new Set([x, -1]);
        border_y = y;
        future_x = direction[0] + body[0][0],
        future_y = direction[1] + body[0][1];

    if (border_x.has(future_x)) {
      return true;
    } else if (border_y === future_y || contains(db.fixed_block, [future_x, future_y])) {
      // pieces stop moving once they touch something below them or touch the ground
      db.fixed_block.push(...db.block.body);
      // sort ascending by row
      db.fixed_block = db.fixed_block.sort(function(a, b) {
        return a[1] - b[1];
      });
      // every time a piece stops, a new one is born up top at a random x-coordinate
      db.block.body = small_square(db.board);
      return true
    }
  };

  // if a row is cleared, the whole board moves down to fill the space
  var move_above_blocks_down = function(coords, removed_y) {
    // move blocks above the removed down
    return coords.map(function([x, y]) {
      if (y < removed_y) {
        return [x, y + 1];
      } else {
        return [x, y];
      }
    });
  };

  // if an entire row is full of pieces that have stopped moving, it is cleared
  var clear_full_row = function(db) {
    var row_size = db.board[0];
    // group fixed_block rows by their length
    var rows = partition_by(([x, y]) => y, db.fixed_block)
    var rows_length = group_by(row => row.length, rows);
    // if any has the same length as the board we remove that row
    if (rows_length[row_size]) {
      $.each(rows_length[row_size], function(i, row) {
        var y_val = row[0][1];
        // remove positions with that following y value
        db.fixed_block = db.fixed_block.filter(([x, y]) => (y !== y_val));

      });
      var row_y = rows_length[db.board[0]][0][0][1]
      var remaining = db.fixed_block.filter(([x, y]) => (y !== row_y));
      db.fixed_block = move_above_blocks_down(remaining, row_y);
    }
  };


  return {
    small_square: small_square,
    move_block: move_block,
    key_code_to_move: key_code_to_move,
    collisions: collisions,
    clear_full_row: clear_full_row
  };

})();

// ---------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------

var views = (function(game_helpers) {

  var InitialState = function() {
    // A standard board is 10 blocks wide and 20 blocks high
    var board = [10, 20];
    var block = {
      // At regular intervals, any piece on the board moves down by one block
      direction: [0, 1],
      body: game_helpers.small_square(board)
    };

    this.board = board;
    this.block = block;
    this.points = 0;
    this.is_game_running = true;
    this.speed = 300;
    this.fixed_block = [];
  };

  // Renders a player's score
  var score = function() {
    $(".score").html("Score: " + db.points);
  };

  // Renders the game over overlay if the game is finished
  var game_over = function() {
    var $overlay = $("<div></div>");
    if (!db.is_game_running) {
      var $play = $("<div></div>")
        .addClass("play")
        .html("<h1>↺</h1>");
      $overlay
        .addClass("overlay")
        .append($play);
    }
    $("#game-over").html($overlay);
  };

  // Renders the game board area with snake and the food item
  var board = function() {
    var width, height, $table;
    [width, height] = db.board;

    $table = $("<table></table>")
      .addClass("stage")
      .css({height: 677, width: 527});
    $.each(range(0, height), function(y) {
      var $tr = $("<tr></tr>");
      $.each(range(0, width), function(x) {
        var current_pos, $cell;
        current_pos = [x, y];
        $cell = $("<td></td>");
        if (contains(db.block.body, current_pos)) {
          $cell.addClass("block-on-cell");
        } else if (contains(db.fixed_block, current_pos)) {
          $cell.addClass("fixed-block");
        } else {
          $cell.addClass("cell");
        }
        $tr.append($cell);
      });
      $table.append($tr);
    });
    $(".stage").replaceWith($table);
  };


  return {
    InitialState: InitialState,
    board: board,
    score: score,
    game_over: game_over
  };

})(game_helpers);

// ---------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------

var handlers = (function(views, game_helpers) {
  var initial_state = new views.InitialState();

  var init = function() {
    reg_event_db("initialize", function(db) {
      for (var k in initial_state) {
        db[k] = initial_state[k];
      }

      $("#game-over").html("");
      return db;
    });

    // TODO: next-state
    reg_event_db("next-state", function(db, direction) {
      if (db.is_game_running) {
        // if (game_helpers.collisions(db.snake, db.board)) {
        //   db.is_game_running = false;
        //   views.game_over();
        if (game_helpers.collisions(db, direction || db.block.direction)) {
          // don't move block;
        } else {
          game_helpers.move_block(db.block, direction || db.block.direction);
        }
        // } else {
        views.board();
        // TODO: score
        //   views.score();
        game_helpers.clear_full_row(db);
      }
      return db;
    });

  };

  return {
    init: init
  };

})(views, game_helpers);

// ---------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------

var core = (function(handlers, views, game_helpers) {

  // main rendering function
  var game = function() {
    views.board();
    views.score();
    views.game_over();
  };

  //main app function
  var run = function() {
    handlers.init();
    dispatch(["initialize"]);
    game();
  };

  return {
    run: run
  };

})(handlers, views, game_helpers);

// ---------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------

$(document).ready(function() {
  core.run();

  // listen to directions input
  $(window).on("keydown", function(e) {
    var key_code = e.keyCode;
    if (game_helpers.key_code_to_move[key_code]) {
      // tapping the left or right arrows moves a piece left or right
      // (but not past the edge)
      dispatch(["next-state", game_helpers.key_code_to_move[key_code]]);
    }
  });

  // tic
  block_moving = setInterval(function() {
    dispatch(["next-state"]);
  }, 300)
});


// tapping the down arrow jumps the current piece all the way down until something stops it
