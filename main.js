const SCALE = 5;
let E_WALL = 1;
let E_COLLISIONS = 1;
class Engine {
    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {number} */
    #start;

    /** @type {number} */
    #t;

    /** @type {number} */
    #deltaT;
    
    /** @type {number} */
    #frames;

    /** @type {HTMLDivElement} */
    #stats;

    /** @type {Body[]} */
    #elements;

    /** @type {number} */
    #animationHandle;

    /** @type {boolean} */
    #active;

    
    constructor({element: c, stats: s}) {
        this.#canvas = document.querySelector(c);
        
        this.#stats = document.querySelector(s);
        this.#elements = [];

        this.setup();
    }

    start() {
        if(this.#active) return;
        this.#start = Date.now();
        this.#t =  0;
        this.#frames = 0;
        this.#active = true;
        this.update();
    }

    stop() {
        this.#active = false;
        cancelAnimationFrame(this.#animationHandle);
    }


    setup() {
        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight;

        window.addEventListener("resize", e => {
            this.#canvas.width = window.innerWidth;
            this.#canvas.height = window.innerHeight;
        });

        this.#stats.querySelector(".controls .start").addEventListener("click", e => this.start());
        this.#stats.querySelector(".controls .stop").addEventListener("click", e => this.stop());
        this.#stats.querySelector(".controls .add").addEventListener("click", e => {
            let c2 = new Circle({position: [1, 5], acceleration: [0, -9.81], velocity: [10,1], radius: 0.2 / (2 **0.5), mass: 1});
            E.add(c2);
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.#frames++;
        const oldT = this.#t;
        this.#t = (Date.now() - this.#start) / 1_000;
        this.#deltaT = this.#t - oldT;

        let handled = [];

        // Update stats
        this.updateStats();
        
        this.#elements.forEach((b1, i1) => 
            this.#elements.forEach((b2, i2) => 
                this.collision([b1, i1], [b2, i2], handled)
            )
        );
        // Check for collisions
        this.#elements.forEach(b => this.wallCollision(b))


        // Update Position of elements
        this.#elements.forEach(b => b.tickPosition(this.#deltaT));

        // Draw all the frames.
        this.#elements.forEach(b => b.draw(this));
    }


    /**
     * 
     * @param {[Body, number]} arg1 
     * @param {[Body, number]} param1 
     * @returns 
     */
    collision([b1, i1], [b2, i2], handled) {
        if (b1 === b2) return;
        if (handled[i1]) return;

        let distance = b1.closestDistance(b2.position);

        if(b1 instanceof Circle && b2 instanceof Circle) {
            if(distance <= (b1.radius + b2.radius)) {
                if ( handled.filter(([a, b]) => (a === i1 && b == i1) || (a === i2 && b === i2)).length > 0 ) {
                    return;
                }
                // Do collision stuff.

                let lineOfCentres = new Vector(...b2.position).sub(new Vector(...b1.position)).unit();
                let perpendicular = new Vector(lineOfCentres[1], -lineOfCentres[0]);


                let perpVelocities = [new Vector(...b1.velocity).dot(perpendicular), new Vector(...b2.velocity).dot(perpendicular)];
                let parallelVelocities = [new Vector(...b1.velocity).dot(lineOfCentres), new Vector(...b2.velocity).dot(lineOfCentres)];

                // done some algebra:

                // Do the velocity parallel to the line of centres

                let u = parallelVelocities;

                let e = E_COLLISIONS;
                let v = [
                    (u[1] - e * u[0])/2 + (b1.mass * u[0]) / (2 * b2.mass),
                    (e * u[0] + u[1] * (1 - e ) ) / 2 + (b1.mass * u[0]) / (2 * b2.mass)
                ];

                let finalVelocities = [
                    new Vector(...lineOfCentres).scale(v[0]).add(new Vector(...perpendicular).scale(perpVelocities[0])),
                    new Vector(...lineOfCentres).scale(v[1]).add(new Vector(...perpendicular).scale(perpVelocities[1])),
                ];

                b1.velocity = [...finalVelocities[0]];
                b2.velocity = [...finalVelocities[1]];

                handled.push([i1, i2]);

            }
        }
    }

    
    update() {
        this.draw();
        this.#animationHandle = setTimeout(() => this.update(), 1000 / 144);
    }

    updateStats() {
        this.#stats.querySelector(".time .value").innerHTML = this.#t.toFixed(2);
        this.#stats.querySelector(".fps .value").innerHTML = this.fps().toFixed(2);

    }

    /**
     * @param {Body} body
     */
    add(body) {
        this.#elements.push(body);
    }

    get ctx() {
        return this.#canvas.getContext("2d");
    }

    get time() {
        return this.#t;
    }

    fps() {
        return 1 / (this.#deltaT);
    }

    get width() {
        return this.#canvas.width;
    }
    get height() {
        return this.#canvas.height;
    }

    coordinates([x, y]) {
        return [
            this.width / (this.width / this.height * SCALE) * x,
            this.height - this.height / (this.width / this.height * SCALE) * y
        ];
    }

    distance(s) {
        return this.width / (this.width / this.height * SCALE) * s;
    }

    maxCoord() {
        return this.width / (this.height) * SCALE;
    }

    /**
     * @param {Body} body 
     */
    wallCollision(body) {
        const [x, y] = body.position;

        // Bottom wall
        if(body.collision([x, 0])) {
            body.velocity = [body.velocity[0], - E_WALL * body.velocity[1]];
        }

        // Top Wall
        if(body.collision([x, this.maxCoord()])) {
            body.velocity = [body.velocity[0], - E_WALL * body.velocity[1]];
        }

        // Left wall
        if(body.collision([0, y])) {
            body.velocity = [- E_WALL * body.velocity[0], body.velocity[1], ];
        }

        // Right Wall
        if(body.collision([this.maxCoord(), y])) {
            body.velocity = [- E_WALL * body.velocity[0], body.velocity[1], ];
        }
    }
}

class Body {
    /**
     * @type {[number, number]}
     */
    #position;

    /** @type {[number, number]} */
    #velocity;
    
    /** @type {[number, number]} */
    #acceleration;

    /** @type {number} */
    #mass;

    draw() {
        console.error("Unimplemented!");
    }

    get mass() {
        return this.#mass;
    }

    set mass(m) {
        this.#mass = m;
    } 

    get position() {
        return this.#position;
    }

    set position(newPos) {
        this.#position = newPos;
    }

    get velocity() {
        return this.#velocity;
    }

    set velocity(newVel) {
        this.#velocity = newVel;
    }

    get acceleration() {
        return this.#acceleration;
    }

    set acceleration(newAccel) {
        this.#acceleration = newAccel;
    }

    tickPosition(deltaT) {
        this.#position = [
            this.#position[0] + this.#velocity[0] * deltaT,
            this.#position[1] + this.#velocity[1] * deltaT
        ];

        this.#velocity = [
            this.#velocity[0] + this.#acceleration[0] * deltaT,
            this.#velocity[1] + this.#acceleration[1] * deltaT
        ];
    }

    collision([x, y]) {
        console.error("Unimplemented!");
    }

    closestDistance([x, y]) {
        console.error("Unimplemented!");
    }

    closestPoint([x, y]) {
        console.error("Unimplemented!");
    }

}
class Circle extends Body {
    /** @type {number} */
    #radius;

    constructor({position: p, radius: r, velocity: v, acceleration: a, mass: m}) {
        super();
        super.position = p ?? [0, 0];
        super.acceleration = a ?? [0, 0];
        super.velocity = v ?? [0, 0];
        super.mass = m ?? 1;
        this.#radius = r;
    }

    get radius() {
        return this.#radius;
    }

    /**
     * 
     * @param {Engine} E 
     */
    draw(E) {
        const ctx = E.ctx;

        ctx.beginPath();
        ctx.arc(...E.coordinates(super.position), E.distance(this.#radius), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
    }

    collision([x, y]) {
        return this.closestDistance([x, y]) <= this.#radius;
    }

    closestDistance([x, y]) {
        let p = this.closestPoint([x, y]);
        return Math.hypot(x - p[0], y - p[1]);
    }

    closestPoint([x, y]) {
        /** @type {Vector} */
        let d = new Vector(x, y).sub(new Vector(...super.position));
        let s =  d.magnitude();

        let a = new Vector(...super.position).add(d.unit().scale(this.#radius));
        return [a[0], a[1]];
    }
}

class Rectangle extends Body {
    /** @type {[number, number]} */
    #size;

    constructor({position: p, size: s, velocity: v, acceleration: a}) {
        super();
        super.position = p ?? [0, 0];
        super.acceleration = a ?? [0, 0];
        super.velocity = v ?? [0, 0];
        this.#size = s;
    }

    /**
     * 
     * @param {Engine} E 
     */
    draw(E) {
        const ctx = E.ctx;

        ctx.beginPath();
        ctx.rect(...E.coordinates(super.position), E.distance(this.#size[0]), E.distance(this.#size[1]));
        ctx.stroke();
        ctx.fill();

    }
}

class Vector extends Array {

    constructor(...components) {
        super(components.length);
        for(let i = 0; i < components.length; i++) {
            this[i] = components[i];
        }
    }

    magnitude() {
        return Math.sqrt(this.map(c => c**2).reduce((a, b) => a + b));
    }

    angle() {
        return Math.atan2(this[1], this[0]);
    }

    add(v) {
        return this.map((c, i) => c + v[i]);
    }

    /**
     * 
     * @param {Vector} v 
     * @returns {Vector}
     */
    sub(v) {
        return this.map((c, i) => c - v[i])
    }

    scale(s) {
        return this.map(c => c * s)
    }

    dot(v) {
        return this.map((c, i) => c * v[i]).reduce((a, b) => a + b);
    }

    unit() {
        return this.scale(1 / this.magnitude());
    }

    array() {
        return super.slice();
    }
}

class Matrix {
    #elements;

    constructor(...els) {
        this.#elements = els;
    }
    
    rows() {
        return this.#elements.length;
    }

    columns() {
        return this.#elements[0].length;
    }

    row(i) {
        return this.#elements[i];
    }

    column(i) {
        return this.#elements.map(e => e[i]);
    }

    isDimension(r, c) {
        return this.rows() === r && this.columns() === c;
    }

    get(r, c) {
        return this.#elements[r][c];
    }

    inverse() {
        if (this.isDimension(2,2)) {
            return new Matrix([this.get(1,1), -this.get(0,1)], [-this.get(1,0), this.get(0,0)]).scale(1 / this.det());
        }
    }

    det() {
        if (this.isDimension(2,2)) {
            return this.get(0,0) * this.get(1,1) - this.get(0,1) * this.get(1,0);
        }
    }
    
    scale(lambda) {
        return this.op(e => e * lambda);
    }

    each(func) {
        return new Matrix(...this.#elements.map((r, iR) => r.map((el, iC) => func(el, [iR, iC]))));
    }

    transpose() {
        return Array(this.rows()).fill().map((_, i) => this.column(i));
    }

    multiply(B) {
        let colsB = B.transpose();

        console.log(colsB)

        return new Matrix(
            ...colsB.map(
                col => col.map(
                    (m, colI) =>
                        this.column(colI)
                            .map(e => e * m)
                ).reduce(
                    (a, b) => 
                        a.map((e, i) => e + b[i])
                )
            )
        );
    }

    contents() {
        return this.#elements;
    }
}

Matrix.rotation = function(theta) {
    return new Matrix(
        [Math.cos(theta), -Math.sin(theta)],
        [Math.sin(theta), Math.cos(theta)]
    );
}
