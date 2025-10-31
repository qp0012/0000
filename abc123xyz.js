// Cài đặt cho hiệu ứng hạt
var settings = {
    particles: {
        length: 8000,      // Tăng số lượng hạt để đầy đặn hơn
        duration: 4,       // Kéo dài thời gian tồn tại của hạt
        velocity: 100,     // Tăng vận tốc cho hiệu ứng sống động
        effect: -0.3,      // Tăng hiệu ứng lực cho chuyển động tự nhiên hơn
        size: 16,          // Tăng kích thước hạt
        glow: true,        // Thêm hiệu ứng phát sáng
        pulseIntensity: 0.5, // Cường độ hiệu ứng rung rinh
        heartSize: 200     // Kích thước trái tim
    }
};

// Khối đảm bảo requestAnimationFrame hoạt động trên nhiều trình duyệt
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || 
                                      window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                      timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

// Lớp Point để quản lý tọa độ
var Point = function() {
    function Point(x, y) {
        this.x = typeof x !== "undefined" ? x : 0;
        this.y = typeof y !== "undefined" ? y : 0;
    }

    Point.prototype.clone = function() {
        return new Point(this.x, this.y);
    };

    Point.prototype.length = function(length) {
        if (typeof length === "undefined") {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    };

    Point.prototype.normalize = function() {
        var length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    };

    return Point;
}();

// Lớp Particle để quản lý hạt
var Particle = function() {
    function Particle() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
        this.isBorder = false;
    }

    Particle.prototype.initialize = function(x, y, dx, dy, isBorder) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
        this.isBorder = isBorder;
    };

    Particle.prototype.update = function(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    };

    Particle.prototype.draw = function(context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }

        var size = image.width * ease(this.age / settings.particles.duration);

        if (this.isBorder) {
            var pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005 + this.position.x * 0.01);
            context.globalAlpha = (1 - this.age / settings.particles.duration) * pulse * 2;
            size = size * 1.3;
        } else {
            context.globalAlpha = (1 - this.age / settings.particles.duration) * 0.9;
        }

        context.drawImage(
            image,
            this.position.x - size / 2,
            this.position.y - size / 2,
            size,
            size
        );
    };

    return Particle;
}();

// Lớp ParticlePool để quản lý nhóm hạt
var ParticlePool = function() {
    var particles, firstActive = 0, firstFree = 0, duration = settings.particles.duration;

    function ParticlePool(length) {
        particles = new Array(length);
        for(var i = 0; i < particles.length; i++)
            particles[i] = new Particle();
    }

    ParticlePool.prototype.add = function(x, y, dx, dy, isBorder) {
        particles[firstFree].initialize(x, y, dx, dy, isBorder);
        firstFree++;
        if(firstFree == particles.length) firstFree = 0;
        if(firstActive == firstFree) firstActive++;
        if(firstActive == particles.length) firstActive = 0;
    };

    ParticlePool.prototype.update = function(deltaTime) {
        var i;
        if(firstActive < firstFree) {
            for(i = firstActive; i < firstFree; i++)
                particles[i].update(deltaTime);
        }
        if(firstFree < firstActive) {
            for(i = firstActive; i < particles.length; i++)
                particles[i].update(deltaTime);
            for(i = 0; i < firstFree; i++)
                particles[i].update(deltaTime);
        }
        while(particles[firstActive].age >= duration && firstActive != firstFree) {
            firstActive++;
            if(firstActive == particles.length) firstActive = 0;
        }
    };

    ParticlePool.prototype.draw = function(context, image) {
        var i;
        if(firstActive < firstFree) {
            for(i = firstActive; i < firstFree; i++)
                particles[i].draw(context, image);
        }
        if(firstFree < firstActive) {
            for(i = firstActive; i < particles.length; i++)
                particles[i].draw(context, image);
            for(i = 0; i < firstFree; i++)
                particles[i].draw(context, image);
        }
    };

    return ParticlePool;
}();

// Khối chính thực hiện hiệu ứng
(function(canvas) {
    var context = canvas.getContext("2d"),
        particles = new ParticlePool(settings.particles.length),
        particleRate = settings.particles.length / settings.particles.duration,
        time;

    // Hàm tạo điểm trên hình trái tim
    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }

    // Hàm tạo điểm trong hình trái tim
    function pointInHeart() {
        var t = Math.PI - 2 * Math.PI * Math.random();
        var pointOn = pointOnHeart(t);
        var factor = Math.random() * 0.85;
        var x = pointOn.x * factor;
        var y = pointOn.y * factor;
        return new Point(x, y);
    }

    // Hàm tạo điểm trên viền trái tim
    function pointOnHeartBorder() {
        var t = Math.PI - 2 * Math.PI * Math.random();
        var pointOn = pointOnHeart(t);
        return new Point(pointOn.x, pointOn.y);
    }

    // Tạo hình ảnh hạt (hình trái tim nhỏ)
    var image = function() {
        var canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;

        function to(t) {
            var point = pointOnHeart(t);
            point.x = settings.particles.size/3 + point.x * settings.particles.size/550;
            point.y = settings.particles.size/3 - point.y * settings.particles.size/550;
            return point;
        }

        context.beginPath();
        var t = -Math.PI;
        var point = to(t);
        context.moveTo(point.x, point.y);
        while(t < Math.PI) {
            t += 0.01;
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        context.closePath();
        context.fillStyle = "#ea80b0";
        context.fill();

        var image = new Image();
        image.src = canvas.toDataURL();
        return image;
    }();

    // Hàm render chính
    function render() {
        requestAnimationFrame(render);
        var newTime = new Date().getTime() / 1000,
            deltaTime = newTime - (time || newTime);
        time = newTime;

        context.clearRect(0, 0, canvas.width, canvas.height);

        var amount = particleRate * deltaTime;
        for(var i = 0; i < amount; i++) {
            var pos, dir, isBorder;
            if(i % 2 === 0) {
                pos = pointOnHeartBorder();
                isBorder = true;
                dir = pos.clone().length(settings.particles.velocity * 0.3);
            } else {
                pos = pointInHeart();
                isBorder = false;
                dir = pos.clone().length(settings.particles.velocity * 0.7);
            }
            particles.add(
                canvas.width/2 + pos.x,
                canvas.height/2 - pos.y,
                dir.x,
                -dir.y,
                isBorder
            );
        }

        particles.update(deltaTime);
        particles.draw(context, image);
    }

    // Xử lý thay đổi kích thước cửa sổ
    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.onresize = onResize;
    
    setTimeout(function() {
        onResize();
        render();
    }, 10);
})(document.getElementById("pinkboard"));