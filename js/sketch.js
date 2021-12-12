let game, container;

function setup() {
	var size = 48;

	createCanvas(size * 10, size * 9);
	game = new Bombsweeper(canvas.width / size, (canvas.width / size) - 2, size, 9);

	container = new p5.Element(document.getElementById("container"));
	container.center("horizontal");
	container.position(null, 10);

	var btn_new = new p5.Element(document.getElementById("btn-new"));
	btn_new.style("width", container.style("width"));

	randomSeed(millis());
}

function windowResized() {
	container.center("horizontal");
}

function draw() {
	game.update();

	background(0);

	game.draw();
}

function mousePressed(e) {
	game.onClick(floor(mouseX / game.size), floor(mouseY / game.size) - 1, e.button == 0);
	game.checkWin();
}

class Tile {
	constructor() {
		this.bomb = false;
		this.num = 0;
		this.revealed = false;
		this.match = false;
		this.fall = false;
	}
}

class Bombsweeper {
	constructor(width, height, size, bombs) {
		this.width = width;
		this.height = height;
		this.size = size;
		this.bombs = max(min(bombs, (this.width * this.height) - 1), 1);

		this.first = true;
		this.state = 0;
		this.matchs = 0;
		this.time = 0;
		this.runtime = false;

		this.board = [];
		this.clearBoard();

		this.texture = loadImage("img/tiles.png");
	}

	update() {
		if(this.state == 0 && this.runtime) this.time += (1 / 60);
	}

	draw() {
		for(var a = 0; a < this.board.length; a++) {
			for(var b = 0; b < this.board[a].length; b++) {
				var tile = this.getTile(b, a);
				
				var current;
				if(tile.revealed) {
					if(tile.bomb) current = 12;
					else          current = tile.num + 3;
				} else {
					if(tile.fall)       current = 2;
					else if(tile.match) current = 1;
					else                current = 0;
				}

				image(
					this.texture, b * this.size, (a + 1) * this.size, this.size, this.size,
					current * this.texture.height, 0, this.texture.height, this.texture.height
				);
			}
		}

		push();
		textAlign("center", "center");
		textSize(this.size - 15);
		fill(255);
		text(this.state == 0 ? "ALIVE" : (this.state == 1 ? "DIED" : "WIN"), width / 2, this.size / 2);
		text(this.bombs - this.matchs, width / 5, this.size / 2);
		text(floor(this.time), width / 1.25, this.size / 2);
		pop();
	}

	restart() {
		this.clearBoard();
		this.first = true;
		this.state = 0;
		this.matchs = 0;
		this.time = 0;
		this.runtime = false;
	}

	onDie() {
		for(var a = 0; a < this.board.length; a++) {
			for(var b = 0; b < this.board[a].length; b++) {
				var tile = this.getTile(b, a);
				if(tile.bomb && !tile.match) tile.revealed = true;
				if(!tile.bomb && tile.match) tile.fall = true;
			}
		}

		this.state = 1;
	}

	onWin() {
		for(var a = 0; a < this.board.length; a++) {
			for(var b = 0; b < this.board[a].length; b++) {
				var tile = this.getTile(b, a);
				if(tile.bomb && !tile.match) tile.match = true;
			}
		}

		this.state = 2;
	}

	checkWin() {
		for(var a = 0; a < this.board.length; a++) {
			for(var b = 0; b < this.board[a].length; b++) {
				var tile = this.getTile(b, a);
				if(tile.bomb && tile.revealed) {
					this.onDie();
					return;
				}
			}
		}

		var unrevealeds = 0;
		for(var a = 0; a < this.board.length; a++) {
			for(var b = 0; b < this.board[a].length; b++) {
				var tile = this.getTile(b, a);
				if(!tile.revealed) {
					unrevealeds++;
				}
			}
		}
		if(unrevealeds == this.bombs) {
			this.onWin();
		}
	}

	onClick(x, y, dm) {
		if(this.state != 0) return;

		if(dm) {
			var tile = this.getTile(x, y);
			if(tile) {
				if(this.first) {
					this.createBombs(x, y);
					this.calculateNums();
					this.first = false;
					this.runtime = true;
				}

				if(tile.match || tile.revealed) return;
				
				tile.revealed = true;
				
				if(tile.num > 0) return;

				var nears = [[-1, 0], [0, -1], [1, 0], [0, 1]];
				for(var a = 0; a < nears.length; a++) {
					this.onClick(x + nears[a][0], y + nears[a][1], true);
				}
			}
		} else {
			var tile = this.getTile(x, y);
			if(tile && !tile.revealed) {
				if(tile.match) this.matchs--;
				else           this.matchs++;

				tile.match = !tile.match;
			}
		}
	}

	getTile(x, y) {
		if(this.board[floor(y)]) {
			return this.board[floor(y)][floor(x)] || false;
		}
		return false;
	}

	clearBoard() {
		this.board = [];
		for(var a = 0; a < this.height; a++) {
			this.board[a] = [];
			for(var b = 0; b < this.width; b++) {
				this.board[a][b] = new Tile();
			}
		}
	}

	createBombs(ix, iy) {
		var bombs = this.bombs;
		while(bombs > 0) {
			var rx = randomInt(0, this.width);
			var ry = randomInt(0, this.height);

			var tile = this.getTile(rx, ry);
			if(tile) {
				if(!tile.bomb && !(rx == ix && ry == iy)) {
					tile.bomb = true;
					bombs--;
				}
			}
		}
	}

	calculateNums() {
		var nears = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for(var a = 0; a < this.height; a++) {
			for(var b = 0; b < this.width; b++) {
				var tile = this.getTile(b, a);
				if(tile && tile.bomb) {
					for(var c = 0; c < nears.length; c++) {
						var near = this.getTile(b + nears[c][0], a + nears[c][1]);
						if(near && !near.bomb) {
							near.num++;
						}
					}
				}
			}
		}
	}
}

function randomInt(min, max) {
	return floor(random(min, max));
}