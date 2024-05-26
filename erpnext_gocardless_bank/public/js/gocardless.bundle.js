/*
*  ERPNext Gocardless Bank © 2023
*  Author:  Ameen Ahmed
*  Company: Level Up Marketing & Software Development Services
*  Licence: Please refer to LICENSE file
*/


(function() {
    var LU = {
        $type(v) {
            if (v == null) return v === null ? 'Null' : 'Undefined';
            let t = Object.prototype.toString.call(v).slice(8, -1);
            return t === 'Number' && isNaN(v) ? 'NaN' : t;
        },
        $hasProp(k, o) { return Object.prototype.hasOwnProperty.call(o || this, k); },
        $is(v, t) { return v != null && this.$type(v) === t; },
        $of(v, t) { return typeof v === t; },
        $isObjLike(v) { return v != null && this.$of(v, 'object'); },
        $isStr(v) { return this.$is(v, 'String'); },
        $isStrVal(v) { return this.$isStr(v) && v.length; },
        $isNum(v) { return this.$is(v, 'Number') && isFinite(v); },
        $isBool(v) { return v === true || v === false; },
        $isBoolLike(v) { return this.$isBool(v) || v === 0 || v === 1; },
        $isFunc(v) { return this.$of(v, 'function') || /(Function|^Proxy)$/.test(this.$type(v)); },
        $isArr(v) { return this.$is(v, 'Array'); },
        $isArrVal(v) { return this.$isArr(v) && v.length; },
        $isArgs(v) { return this.$is(v, 'Arguments'); },
        $isArgsVal(v) { return this.$isArgs(v) && v.length; },
        $isArrLike(v) { return this.$isArr(v) || this.$isArgs(v); },
        $isArrLikeVal(v) { return this.$isArrLike(v) && v.length; },
        $isEmptyObj(v) {
            if (this.$isObjLike(v)) for (let k in v) { if (this.$hasProp(k, v)) return false; }
            return true;
        },
        $isBaseObj(v) { return !this.$isArgs(v) && this.$is(v, 'Object'); },
        $isBaseObjVal(v) { return this.$isBaseObj(v) && !this.$isEmptyObj(v); },
        $fnStr(v) { return Function.prototype.toString.call(v); },
        $isObj(v, _) {
            if (!this.$isObjLike(v)) return false;
            let k = 'constructor';
            v = Object.getPrototypeOf(v);
            return this.$hasProp(k, v) && this.$isFunc(v[k])
                && (!_ || this.$fnStr(v[k]) === this.$fnStr(Object));
        },
        $isObjVal(v) { return this.$isObj(v) && !this.$isEmptyObj(v); },
        $isDataObj(v) { return this.$isObj(v, 1); },
        $isDataObjVal(v) { return this.$isDataObj(v) && !this.$isEmptyObj(v); },
        $isIter(v) { return this.$isBaseObj(v) || this.$isArrLike(v); },
        $isEmpty(v) {
            return v == null || v === '' || v === 0 || v === false
                || (this.$isArrLike(v) && v.length < 1) || this.$isEmptyObj(v);
        },
        $toArr(v, s, e) { try { return Array.prototype.slice.call(v, s, e); } catch(_) { return []; } },
        $toJson(v, d) { try { return JSON.stringify(v); } catch(_) { return d; } },
        $parseJson(v, d) { try { return JSON.parse(v); } catch(_) { return d; } },
        $clone(v) { return this.$parseJson(this.$toJson(v)); },
        $filter(v, fn) {
            fn = this.$fn(fn) || function(v) { return v != null; };
            let o = this.$isBaseObj(v), r = o ? {} : [];
            if (o) for (let k in v) { if (this.$hasProp(k, v) && fn(v[k], k) !== false) r[k] = v[k]; }
            else for (let i = 0, x = 0, l = v.length; i < l; i++) { if (fn(v[i], i) !== false) r[x++] = v[i]; }
            return r;
        },
        $map(v, fn) {
            if (!(fn = this.$fn(fn))) return this.$clone(v);
            let o = this.$isBaseObj(v), r = o ? {} : [];
            if (o) for (let k in v) { if (this.$hasProp(k, v)) r[k] = fn(v[k], k); }
            else for (let i = 0, x = 0, l = v.length; i < l; i++) { r[x++] = fn(v[i], i); }
            return r;
        },
        $assign() {
            let a = arguments.length && this.$filter(arguments, this.$isBaseObj);
            if (!a || !a.length) return {};
            a.length > 1 && Object.assign.apply(null, a);
            return a[0];
        },
        $extend() {
            let a = arguments.length && this.$filter(arguments, this.$isBaseObj);
            if (!a || a.length < 2) return a && a.length ? a[0] : {};
            let d = this.$isBool(arguments[0]) && arguments[0];
            for (let i = 1, l = a.length; i < l; i++)
                for (let k in a[i]) {
                    if (!this.$hasProp(k, a[i]) || a[i][k] == null) continue;
                    d && this.$isBaseObj(a[0][k]) && this.$isBaseObj(a[i][k])
                        ? this.$extend(d, a[0][k], a[i][k]) : (a[0][k] = a[i][k]);
                }
            return a[0];
        },
        $fn(fn, o) { if (this.$isFunc(fn)) return fn.bind(o || this); },
        $afn(fn, a, o) {
            if (a == null) return this.$fn(fn, o);
            if (!this.$isFunc(fn)) return;
            a = !this.$isArr(a) ? [a] : a.slice();
            a.unshift(o || this);
            return fn.bind.apply(fn, a);
        },
        $call(fn, a, o) {
            a = a == null || this.$isArrLike(a) ? a : [a];
            o = o || this;
            let l = a != null && a.length;
            if (!l) return fn.call(o);
            if (l < 2) return fn.call(o, a[0]);
            if (l < 3) return fn.call(o, a[0], a[1]);
            if (l < 4) return fn.call(o, a[0], a[1], a[2]);
            return fn.apply(o, a);
        },
        $try(fn, a, o) {
            try { return this.$call(fn, a, o); } catch(e) { console.error(e.message, e.stack); }
        },
        $xtry(fn, a, o) { return this.$afn(this.$try, [fn, a, o]); },
        $timeout(fn, tm, a, o) {
            return (tm != null && setTimeout(this.$afn(fn, a, o), tm)) || (fn && clearTimeout(fn)) || this;
        },
        $proxy(fn, tm) {
            fn = this.$fn(fn);
            return {
                _fn(a, d) {
                    this.cancel();
                    let f = function() { a.length ? fn.apply(null, a) : fn(); };
                    this._r = d ? setTimeout(f, tm) : f();
                },
                call() { this._fn(arguments); },
                delay() { this._fn(arguments, 1); },
                cancel() { if (this._r) this._r = clearTimeout(this._r); },
            };
        },
        $def(v, o) { return this.$ext(v, o, 0); },
        $xdef(v, o) { return this.$ext(v, o, 0, 1); },
        $static(v, o) { return this.$ext(v, o, 1); },
        $ext(v, o, s, e) {
            for (let k in v) { this.$hasProp(k, v) && this.$getter(k, v[k], s, e, o); }
            return this;
        },
        $getter(k, v, s, e, o) {
            o = o || this;
            if (!s && k[0] === '_') k = k.substring(1);
            if (!s) o['_' + k] = v;
            if (s || (e && o[k] == null)) Object.defineProperty(o, k, s ? {value: v} : {get() { return this['_' + k]; }});
            return this;
        },
        $hasElem(id) { return !!document.getElementById(id); },
        $makeElem(tag, opt) {
            let $el = document.createElement(tag);
            if (opt) for (let k in opt) { if (this.$hasProp(k, opt)) $el[k] = opt[k]; }
            return $el;
        },
        $loadJs(src, opt) {
            opt = this.$assign(opt || {}, {src, type: 'text/javascript', 'async': true});
            document.getElementsByTagName('body')[0].appendChild(this.$makeElem('script', opt));
            return this;
        },
        $loadCss(href, opt) {
            opt = this.$assign(opt || {}, {href, type: 'text/css', rel: 'stylesheet', 'async': true});
            document.getElementsByTagName('head')[0].appendChild(this.$makeElem('link', opt));
            return this;
        },
        $load(css, opt) {
            opt = this.$assign(opt || {}, {innerHTML: css, type: 'text/css'});
            document.getElementsByTagName('head')[0].appendChild(this.$makeElem('style', opt));
            return this;
        }
    };
    
    
    class LevelUpCore {
        destroy() { for (let k in this) { if (this.$hasProp(k)) delete this[k]; } }
    }
    LU.$extend(LevelUpCore.prototype, LU);
    frappe.LevelUpCore = LevelUpCore;
    
    
    class LevelUpBase extends LevelUpCore {
        constructor(mod, key, doc, ns, prod) {
            super();
            this._mod = mod;
            this._key = key;
            this._tmp = '_' + this._key;
            this._doc = new RegExp('^' + doc);
            this._real = this._key + '_';
            this._pfx = '[' + this._key.toUpperCase() + ']';
            this._ns = ns + (!ns.endsWith('.') ? '.' : '');
            this._prod = prod;
            this._events = {
                list: {},
                real: {},
                once: 'ready page_change page_clean destroy after_destroy'.split(' ')
            };
        }
        get module() { return this._mod; }
        get key() { return this._key; }
        $alert(t, m, i, x) {
            m == null && (m = t) && (t = this._mod);
            t = this.$assign({title: t, indicator: i}, this.$isBaseObj(m) ? m : {message: m, as_list: this.$isArr(m)});
            this.call('on_alert', t, x);
            (x === 'fatal' && (this._err = 1) ? frappe.throw : frappe.msgprint)(t);
            return this;
        }
        debug(t, m) { return this._prod ? this : this.$alert(t, m, 'gray', 'debug'); }
        log(t, m) { return this._prod ? this : this.$alert(t, m, 'cyan', 'log'); }
        info(t, m) { return this.$alert(t, m, 'light-blue', 'info'); }
        warn(t, m) { return this.$alert(t, m, 'orange', 'warn'); }
        error(t, m) { return this.$alert(t, m, 'red', 'error'); }
        fatal(t, m) { return this.$alert(t, m, 'red', 'fatal'); }
        $toast(m, i, s, a) {
            this.$isBaseObj(s) && (a = s) && (s = 0);
            frappe.show_alert(this.$assign({indicator: i}, this.$isBaseObj(m) ? m : {message: m}), s || 4, a);
            return this;
        }
        success_(m, s, a) { return this.$toast(m, 'green', s, a); }
        info_(m, s, a) { return this.$toast(m, 'blue', s, a); }
        warn_(m, s, a) { return this.$toast(m, 'orange', s, a); }
        error_(m, s, a) { return this.$toast(m, 'red', s, a); }
        $console(fn, a) {
            if (this._prod) return this;
            !this.$isStr(a[0]) ? Array.prototype.unshift.call(a, this._pfx)
                : (a[0] = (this._pfx + ' ' + a[0]).trim());
            (console[fn] || console.log).apply(null, a);
            return this;
        }
        _debug() { return this.$console('debug', arguments); }
        _log() { return this.$console('log', arguments); }
        _info() { return this.$console('info', arguments); }
        _warn() { return this.$console('warn', arguments); }
        _error() { return this.$console('error', arguments); }
        ajax(u, o, s, f) {
            o = this.$extend(1, {
                url: u, method: 'GET', cache: false, 'async': true, crossDomain: true,
                headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
                success: this.$fn(s),
                error: this.$fn(function(r, t) {
                    r = (this.$isStrVal(r) && __(r)) || (this.$isStrVal(t) && __(t))
                        || __('The ajax request sent raised an error.');
                    (f = this.$fn(f)) ? f({message: r}) : this._error(r);
                })
            }, o);
            if (o.contentType == null)
                o.contentType = 'application/' + (o.method == 'post' ? 'json' : 'x-www-form-urlencoded') + '; charset=utf-8';
            this.call('on_ajax', o);
            try { $.ajax(o); } catch(e) {
                (f = this.$fn(f)) ? f(e) : this._error(e.message);
                if (this._err) throw e;
            } finally { this._err = 0; }
            return this;
        }
        get_method(v) { return this._ns + v; }
        request(m, a, s, f) {
            let d = {
                method: m.includes('.') ? m : this.get_method(m),
                callback: this.$fn(function(r) {
                    r = (this.$isBaseObj(r) && r.message) || r;
                    if (!this.$isBaseObj(r) || !r.error) return (s = this.$fn(s)) && s(r);
                    let x = this.$isArrVal(r.list);
                    if (x) r = this.$map(r.list, function(v) { return __(v); });
                    else r = this.$isBaseObj(r) && ((this.$isStrVal(r.message) && __(r.message))
                        || (this.$isStrVal(r.error) && __(r.error)))
                        || __('The request sent returned an invalid response.');
                    (f = this.$fn(f)) ? f({message: x ? r.join('\n') : r, self: true}) : this._error(r);
                }),
                error: this.$fn(function(r, t) {
                    r = (this.$isStrVal(r) && __(r)) || (this.$isStrVal(t) && __(t))
                        || __('The request sent raised an error.');
                    (f = this.$fn(f)) ? f({message: r}) : this._error(r);
                })
            };
            if (!this.$isBaseObj(a)) a = {};
            this.call('on_request', a);
            !this.$isEmptyObj(a) && this.$assign(d, {type: 'POST', args: a});
            try { frappe.call(d); } catch(e) {
                (f = this.$fn(f)) ? f(e) : this._error(e.message);
                if (this._err) throw e;
            } finally { this._err = 0; }
            return this;
        }
        on(e, fn)  { return this._on(e, fn); }
        xon(e, fn)  { return this._on(e, fn, 0, 1); }
        once(e, fn) { return this._on(e, fn, 1); }
        xonce(e, fn) { return this._on(e, fn, 1, 1); }
        real(e, fn, n) { return this._on(e, fn, n, 0, 1); }
        xreal(e, fn, n) { return this._on(e, fn, n, 1, 1); }
        off(e, fn, rl) {
            if (e == null) return this._off();
            if (this.$isBoolLike(e)) return this._off(0, 1);
            fn = this.$isFunc(fn) && fn;
            e = e.split(' ');
            for (let i = 0, l = e.length, ev; i < l; i++)
                (ev = (rl ? this._real : '') + e[i]) && this._events.list[ev] && this._off(ev, fn);
            return this;
        }
        emit(e) {
            e = e.split(' ');
            for (let a = this.$toArr(arguments, 1), p = Promise.resolve(), i = 0, l = e.length; i < l; i++)
                this._events.list[e[i]] && this._emit(e[i], a, p);
            return this;
        }
        call(e) {
            e = e.split(' ');
            for (let a = this.$toArr(arguments, 1), i = 0, l = e.length; i < l; i++)
                this._events.list[e[i]] && this._emit(e[i], a);
            return this;
        }
        _on(ev, fn, o, s, r) {
            ev = ev.split(' ');
            fn = this.$fn(fn);
            let rd;
            for (let es = this._events, i = 0, l = ev.length, e; i < l; i++) {
                e = (r ? this._real : '') + ev[i];
                e === es.once[0] && this._is_ready && (rd = es.once[0]);
                es.once.includes(e) && (o = 1);
                !es.list[e] && (es.list[e] = []) && (!r || frappe.realtime.on(e, (es.real[e] = this._rfn(e))));
                es.list[e].push({f: fn, o, s});
            }
            return rd ? this.emit(rd) : this;
        }
        _rfn(e) {
            return this.$fn(function(r) {
                (r = (this.$isBaseObj(r) && r.message) || r) && this._emit(e, r != null ? [r] : r, Promise.wait(300));
            });
        }
        _off(e, fn) {
            if (e && fn) this._del(e, fn);
            else if (!e) for (let ev in this._events.list) { (fn ? this._off : this._del)(ev, fn); }
            else {
                let es = this._events;
                es.real[e] && frappe.realtime.off(e, es.real[e]);
                delete es.list[e];
                delete es.real[e];
            }
            return this;
        }
        _del(e, fn) {
            let ev = this._events.list[e].slice(), ret = [];
            for (let x = 0, i = 0, l = ev.length; i < l; i++)
                (fn ? ev[i].f !== fn : ev[i].s) && (ret[x++] = ev[i]);
            !ret.length ? this._off(e) : (this._events.list[e] = ret);
        }
        _emit(e, a, p) {
            let ev = this._events.list[e].slice(), ret = [];
            p && p.catch(this.$fn(function(z) { this._error('Events emit', e, a, z.message); }));
            for (let x = 0, i = 0, l = ev.length; i < l; i++) {
                p ? p.then(this.$xtry(ev[i].f, a)) : this.$try(ev[i].f, a);
                !ev[i].o && (ret[x++] = ev[i]);
            }
            !ret.length ? this._off(e) : (this._events.list[e] = ret);
        }
    }
    
    
    var LUR = {
        on(o) {
            for (let k = ['router', 'route'], i = 0, l = k.length; i < l; i++)
                (o._router.obj = frappe[k[i]]) && (i < 1 || (o._router.old = 1));
            this._reg(o, 'on');
            this.get(o);
        },
        off(o) { this._reg(o, 'off') && (o._router.obj = o._router.old = null); },
        get(o) {
            let d = ['app'], v;
            try { v = !o._router.old ? frappe.get_route() : (o._router.obj ? o._router.obj.parse() : null); } catch(_) {}
            if (!LU.$isArrVal(v)) v = d;
            else {
                v = LU.$map(v, function(z) { return cstr(z); });
                v = LU.$filter(v, function(z, i) { return z.length && z !== '#'; });
                if (v.length) v[0] = cstr(v[0]).toLowerCase();
            }
            let r = 0;
            for (let i = 0, l = v.length; i < l; i++) {
                if ((!o._router.val || o._router.val.indexOf(v[i]) !== i) && ++r) break;
            }
            if (r) o._router.val = v;
            return r > 0;
        },
        _reg(o, a) {
            if (!o._router.obj || !LU.$isFunc(o._router.obj[a])) return;
            o._router.obj[a]('change', o._win.e.change);
        },
    },
    LUF = {
        has_flow(f) { try { return f && !f.is_new() && f.states && f.states.get_state(); } catch(_) {} },
        is_field(f) { return f && f.df && !/^((Tab|Section|Column) Break|Table)$/.test(f.df.fieldtype); },
        is_table(f) { return f && f.df && f.df.fieldtype === 'Table'; },
        get_field(f, k, g, r, c, d) {
            try {
                f = f.get_field(k);
                if (g || r != null) f = f.grid;
                if (r != null) f = f.get_row(r);
                if (c) f = (r != null && d && f.grid_form.fields_dict[c]) || f.get_field(c);
                return f;
            } catch(_) {}
        },
        reload_field(f, k, r, c) {
            if (r != null && !c) {
                try { (LU.$isNum(r) || LU.$isStrVal(r)) && (f = this.get_field(f, k, 1)) && f.refresh_row(r); } catch(_) {}
                return;
            }
            if (r != null && c) {
                if (!LU.$isStrVal(c) || !(f = this.get_field(f, k, 1, r))) return;
                try {
                    (r = f.on_grid_fields_dict[c]) && r.refresh && r.refresh();
                    (r = f.grid_form && f.grid_form.refresh_field) && r(c);
                } catch(_) {}
                return;
            }
            if (!c) {
                try { LU.$isStrVal(k) && f.refresh_field && f.refresh_field(k); } catch(_) {}
                return;
            }
            if (!LU.$isStrVal(c) || !(f = this.get_field(f, k, 1)) || !LU.$isArrVal(f.grid_rows)) return;
            try {
                for (let i = 0, l = f.grid_rows, x; i < l; i++) {
                    r = f.grid_rows[i];
                    (x = r.on_grid_fields_dict[c]) && x.refresh && x.refresh();
                    (x = r.grid_form && r.grid_form.refresh_field) && x(c);
                }
            } catch(_) {}
        },
        field_prop(f, k, g, r, c, p, v) {
            if (LU.$isBaseObj(k)) for (let x in k) { this.field_prop(f, x, g, r, c, k[x]); }
            else if (LU.$isBaseObj(c)) for (let x in c) { this.field_prop(f, k, g, r, x, c[x]); }
            else {
                (g || r != null) && (f = this.get_field(f, k, g, r)) && (k = c);
                let m = r != null ? 'set_field_property' : (g ? 'update_docfield_property' : 'set_df_property');
                try {
                    if (!LU.$isBaseObj(p)) f[m](k, p, v);
                    else for (let x in p) { f[m](k, x, p[x]); }
                    g && r == null && f.debounced_refresh();
                } catch(_) {}
            }
        },
        toggle_field(f, k, g, r, c, e, i) {
            let tf = this.get_field(f, k, g, r, c, 1);
            e = e ? 0 : 1;
            if (!tf || !tf.df || cint(tf.df.hidden) || (i && tf.df._ignore) || cint(tf.df.read_only) === e) return;
            this.field_prop(f, k, g, r, c, 'read_only', e);
            this._toggle_translatable(tf, e ? 1 : 0);
        },
        get_field_desc(f, k, g, r, c, b) {
            k && (f = this.get_field(f, k, g, r, c, 1));
            return cstr((f && f.df && ((b && f.df._description) || (!b && f.df.description))) || '');
        },
        field_desc(f, k, g, r, c, m) {
            let x = 0;
            k && (f = this.get_field(f, k, g, r, c, 1));
            if (f.df._description == null) f.df._description = f.df.description || '';
            if (!LU.$isStr(m)) m = '';
            try {
                if (m.length && f.set_new_description) ++x && f.set_new_description(m);
                else if (f.set_description) {
                    if (!m.length) { m = f.df._description || ''; delete f.df._description; }
                    ++x && f.set_description(m);
                }
                f.toggle_description && f.toggle_description(m.length > 0);
            } catch(_) {}
            return x;
        },
        field_status(f, k, g, r, c, m) {
            let v = LU.$isStrVal(m), tf = this.get_field(f, k, g, r, c, 1), x = 0;
            if ((!v && tf.df.invalid) || (v && !tf.df.invalid))
                try {
                    ++x && ((tf.df.invalid = v ? 1 : 0) || 1) && tf.set_invalid && tf.set_invalid();
                } catch(_) {}
            this.field_desc(tf, 0, 0, null, 0, m) && x++;
            x && this.reload_field(f, k, r, c);
        },
        _toggle_translatable(f, s) {
            try {
                f.df.translatable && f.$wrapper
                && (f = f.$wrapper.find('.clearfix .btn-translation')) && f.hidden(!s);
            } catch(_) {}
        },
    },
    LUT = {
        setup_table(f, k) {
            cint(k.df.read_only) && (k.df._ignore = 1);
            for (let ds = this._docfields(this._grid(f, k.df.fieldname)), i = 0, l = ds.length, d; i < l; i++)
                (d = ds[i]) && cint(d.read_only) && (d._ignore = 1);
        },
        toggle_table(f, k, e, o, i) {
            let tf = this._grid(f, k, i), x = !e || tf._;
            x && (!o || !o.add) && this.toggle_table_add(tf, 0, e);
            x && (!o || !o.del) && this.toggle_table_del(tf, 0, e);
            x && (!o || !o.edit) && this.toggle_table_edit(tf, 0, o && o.keep, e);
            x && (!o || !o.sort) && this.toggle_table_sort(tf, 0, e);
            LUF.reload_field(f, k);
            x && (!o || !o.del) && this.toggle_table_check(tf, 0, e);
            e && delete tf._;
        },
        toggle_table_add(f, k, e) {
            let tf = k ? this._grid(f, k) : f;
            if (e) {
                (!tf._ || tf._.add != null) && (tf.df.cannot_add_rows = tf._ ? tf._.add : false);
                k && tf._ && delete tf._.add;
            } else {
                (tf._ = tf._ || {}) && tf._.add == null && (tf._.add = tf.df.cannot_add_rows);
                tf.df.cannot_add_rows = true;
            }
            k && LUF.reload_field(f, k);
            return 1;
        },
        toggle_table_del(f, k, e) {
            let tf = k ? this._grid(f, k) : f;
            if (e) {
                (!tf._ || tf._.del != null) && (tf.df.cannot_delete_rows = tf._ ? tf._.del : false);
                k && tf._ && delete tf._.del;
            } else {
                (tf._ = tf._ || {}) && tf._.del == null && (tf._.del = tf.df.cannot_delete_rows);
                tf.df.cannot_delete_rows = true;
            }
            k && LUF.reload_field(f, k);
            k && this.toggle_table_check(tf, 0, e);
            return 1;
        },
        toggle_table_edit(f, k, g, e) {
            let tf = k ? this._grid(f, k) : f;
            if (e) {
                (!tf._ || tf._.edit != null) && (tf.df.in_place_edit = tf._ ? tf._.edit : true);
                tf._ && tf._.grid != null && tf.meta && (tf.meta.editable_grid = tf._.grid);
                (!tf._ || tf._.static != null) && (tf.static_rows = tf._ ? tf._.static : false);
                if (tf._ && tf._.read && tf._.read.length) {
                    for (let ds = this._docfields(tf), i = 0, l = ds.length, d; i < l; i++)
                        (d = ds[i]) && !d._ignore && tf._.read.includes(d.fieldname) && (d.read_only = 0);
                }
                if (k && tf._) for (let x = ['edit', 'grid', 'static', 'read'], i = 0; i < 4; i++) { delete tf._[x[i]]; }
                k && LUF.reload_field(f, k);
                return 1;
            }
            (tf._ = tf._ || {}) && tf._.edit == null && (tf._.edit = tf.df.in_place_edit);
            tf.df.in_place_edit = false;
            tf.meta && tf._.grid == null && (tf._.grid = tf.meta.editable_grid);
            tf.meta && (tf.meta.editable_grid = false);
            tf._.static == null && (tf._.static = tf.static_rows);
            tf.static_rows = true;
            tf._.read == null && (tf._.read = []);
            for (let ds = this._docfields(tf), i = 0, x = 0, l = ds.length, d; i < l; i++)
                (d = ds[i]) && !d._ignore && !tf._.read.includes(d.fieldname)
                && (!g || !g.includes(d.fieldname)) && (d.read_only = 1)
                && (tf._.read[x++] = d.fieldname);
            k && LUF.reload_field(f, k);
            return 1;
        },
        toggle_table_sort(f, k, e) {
            let tf = k ? this._grid(f, k) : f;
            if (e) {
                (!tf._ || tf._.sort != null) && (tf.sortable_status = tf._ ? tf._.sort : true);
                k && tf._ && delete tf._.sort;
            } else {
                (tf._ = tf._ || {}) && tf._.sort == null && (tf._.sort = tf.sortable_status);
                tf.sortable_status = false;
            }
            k && LUF.reload_field(f, k);
            return 1;
        },
        toggle_table_check(f, k, e) {
            let tf = k ? this._grid(f, k) : f;
            if (e) {
                (!tf._ || tf._.check) && tf.toggle_checkboxes(1);
                k && tf._ && delete tf._.check;
            } else {
                (tf._ = tf._ || {}) && (tf._.check = 1) && tf.toggle_checkboxes(0);
            }
            return 1;
        },
        _grid(f, k, i) {
            return ((!k && (f = f.grid)) || (f = LUF.get_field(f, k, 1))) && !cint(f.df.hidden) && (!i || !f.df._ignore) && f;
        },
        _docfields(f) {
            let ds = [];
            if (LU.$isArrVal(f.grid_rows)) {
                for (let i = 0, l = f.grid_rows.length, r; i < l; i++)
                    (r = f.grid_rows[i]) && LU.$isArrVal(r.docfields) && ds.push.apply(ds, r.docfields);
            }
            LU.$isArrVal(f.docfields) && ds.push.apply(ds, f.docfields);
            return ds;
        },
    };
    
    
    class LevelUp extends LevelUpBase {
        constructor(mod, key, doc, ns, prod) {
            super(mod, key, doc, ns, prod);
            this.$xdef({is_enabled: true});
            this._router = {obj: null, old: 0, val: null};
            this._win = {
                e: {
                    unload: this.$fn(this.destroy),
                    change: this.$fn(function() { !this._win.c && this._win.fn(); }),
                },
                c: 0,
                fn: this.$fn(function() {
                    if (this._win.c || !LUR.get(this)) return;
                    this._win.c++;
                    this.emit('page_change page_clean');
                    this.$timeout(function() { this._win.c--; }, 2000);
                }),
            };
            addEventListener('beforeunload', this._win.e.unload);
            LUR.on(this);
        }
        options(opts) { return this.$static(opts); }
        destroy() {
            this._win.fn.cancel();
            LUR.off(this);
            removeEventListener('beforeunload', this._win.e.unload);
            this.emit('page_clean destroy after_destroy').off(1);
            super.destroy();
        }
        route(i) { return this._router.val[i] || this._router.val[0]; }
        get is_list() { return this.route(0) === 'list'; }
        get is_tree() { return this.route(0) === 'tree'; }
        get is_form() { return this.route(0) === 'form'; }
        get is_self() { return this._doc.test(this.route(1)); }
        is_doctype(v) { return this.route(1) === v; }
        _is_self_view(f) { return this._doc.test((f && f.doctype) || this.route(1)); }
        get_list(f) { f = f || cur_list; if (this.$isObjLike(f)) return f; }
        get_tree(f) { f = f || cur_tree; if (this.$isObjLike(f)) return f; }
        get_form(f) { f = f || cur_frm; if (this.$isObjLike(f)) return f; }
        get app_disabled_note() { return __('{0} app is disabled.', [this._mod]); }
        setup_list(f) {
            if (!this.is_list || !(f = this.get_list(f)) || !this._is_self_view(f)) return this;
            let n = !f[this._tmp];
            if (this._is_enabled) this.enable_list(f);
            else this.disable_list(f, this.app_disabled_note);
            n && this.off('page_clean').once('page_clean', function() { this.enable_list(f); });
            return this;
        }
        enable_list(f) {
            if (!(f = this.get_list(f)) || (f[this._tmp] && !f[this._tmp].disabled)) return this;
            let k = 'toggle_actions_menu_button';
            f[this._tmp] && f[this._tmp][k] && (f[k] = f[this._tmp][k]);
            f.page.clear_inner_toolbar();
            f.set_primary_action();
            delete f[this._tmp];
            return this;
        }
        disable_list(f, m) {
            if (!(f = this.get_list(f)) || (f[this._tmp] && f[this._tmp].disabled)) return this;
            f.page.hide_actions_menu();
            f.page.clear_primary_action();
            f.page.clear_inner_toolbar();
            m && f.page.add_inner_message(m).removeClass('text-muted').addClass('text-danger');
            let k = 'toggle_actions_menu_button';
            !f[this._tmp] && (f[this._tmp] = {});
            (f[this._tmp][k] = f[k]) && (f[k] = function() {}) && (f[this._tmp].disabled = 1);
            return this;
        }
        setup_tree(f) {
            if (!this.is_tree || !(f = this.get_tree(f)) || !this._is_self_view(f)) return this;
            let n = !f[this._tmp];
            if (this._is_enabled) this.enable_tree(f);
            else this.disable_tree(f, this.app_disabled_note);
            n && this.$xdef({tree: f}).off('page_clean').once('page_clean', function() { this.$xdef({tree: null}).enable_tree(f); });
            return this;
        }
        enable_tree(f) {
            if (!(f = this.get_tree(f)) || (f[this._tmp] && !f[this._tmp].disabled)) return this;
            let k = 'can_create';
            f[this._tmp] && f[this._tmp][k] && (f[k] = f[this._tmp][k]);
            f.page.clear_inner_toolbar();
            f.set_primary_action();
            delete f[this._tmp];
            f.refresh();
            return this;
        }
        disable_tree(f, m) {
            if (!(f = this.get_tree(f)) || (f[this._tmp] && f[this._tmp].disabled)) return this;
            f.page.hide_actions_menu();
            f.page.clear_primary_action();
            f.page.clear_inner_toolbar();
            m && f.page.add_inner_message(m).removeClass('text-muted').addClass('text-danger');
            let k = 'can_create';
            !f[this._tmp] && (f[this._tmp] = {});
            (f[this._tmp][k] = f[k]) && (f[k] = false) && (f[this._tmp].disabled = 1);
            f.refresh();
            return this;
        }
        setup_form(f) {
            if (!this.is_form || !(f = this.get_form(f)) || !this._is_self_view(f)) return this;
            let n = !f[this._tmp];
            if (n && this.$isArrVal(f.fields))
                try {
                    for (let i = 0, l = f.fields.length, c; i < l; i++) {
                        if (!(c = f.fields[i])) continue;
                        if (LUF.is_table(c)) LUT.setup_table(f, c);
                        else if (LUF.is_field(c) && cint(c.df.read_only)) c.df._ignore = 0;
                    }
                } catch(_) {}
            if (this._is_enabled) this.enable_form(f);
            else this.disable_form(f, this.app_disabled_note);
            n && this.off('page_clean').once('page_clean', function() { this.enable_form(f); });
            return this;
        }
        enable_form(f) {
            if (!(f = this.get_form(f)) || (f[this._tmp] && !f[this._tmp].disabled)) return this;
            try {
                if (this.$isArrVal(f.fields))
                    for (let i = 0, l = f.fields.length, c; i < l; i++) {
                        if (!(c = f.fields[i]) || !c.df.fieldname) continue;
                        if (LUF.is_table(c)) LUT.toggle_table(c, 0, 1, 0, 1);
                        else if (LUF.is_field(c)) LUF.toggle_field(f, c.df.fieldname, 0, null, 0, 1, 1);
                    }
                LUF.has_flow(f) ? f.page.show_actions_menu() : f.enable_save();
                f.set_intro();
            } catch(e) { this._error('Enable form', e.message, e.stack); }
            finally {
                delete f[this._tmp];
                this.emit('form_enabled', f);
            }
            return this;
        }
        disable_form(f, m, r) {
            if (!(f = this.get_form(f)) || (f[this._tmp] && f[this._tmp].disabled)) return this;
            try {
                if (this.$isArrVal(f.fields))
                    for (let i = 0, l = f.fields.length, c; i < l; i++) {
                        if (!(c = f.fields[i]) || !c.df.fieldname) continue;
                        if (LUF.is_table(c)) LUT.toggle_table(c, 0, 0, 0, 1);
                        else if (LUF.is_field(c)) LUF.toggle_field(f, c.df.fieldname, 0, null, 0, 0, 1);
                    }
                LUF.has_flow(f) ? f.page.hide_actions_menu() : f.disable_save();
                f.set_intro(m, r || 'red');
            } catch(e) { this._error('Disable form', e.message, e.stack); }
            finally {
                (f[this._tmp] || (f[this._tmp] = {})) && (f[this._tmp].disabled = 1);
                this.emit('form_disabled', f);
            }
            return this;
        }
        get_field(f, k) { if ((f = this.get_form(f))) return LUF.get_field(f, k); }
        get_grid(f, k) { if ((f = this.get_form(f))) return LUF.get_field(f, k, 1); }
        get_tfield(f, k, c) { if ((f = this.get_form(f))) return LUF.get_field(f, k, 1, null, c); }
        get_row(f, k, r) { if ((f = this.get_form(f))) return LUF.get_field(f, k, 1, r); }
        get_rfield(f, k, r, c) { if ((f = this.get_form(f))) return LUF.get_field(f, k, 1, r, c); }
        get_rmfield(f, k, r, c) { if ((f = this.get_form(f))) return LUF.get_field(f, k, 1, r, c, 1); }
        reload_field(f, k) {
            (f = this.get_form(f)) && LUF.reload_field(f, k);
            return this;
        }
        reload_tfield(f, k, c) {
            (f = this.get_form(f)) && LUF.reload_field(f, k, null, c);
            return this;
        }
        reload_row(f, k, r) {
            (f = this.get_form(f)) && LUF.reload_field(f, k, r);
            return this;
        }
        reload_rfield(f, k, r, c) {
            (f = this.get_form(f)) && LUF.reload_field(f, k, r, c);
            return this;
        }
        field_prop(f, k, p, v) {
            (f = this.get_form(f)) && LUF.field_prop(f, k, 0, null, 0, p, v);
            return this;
        }
        tfield_prop(f, k, c, p, v) {
            (f = this.get_form(f)) && LUF.field_prop(f, k, 1, null, c, p, v);
            return this;
        }
        rfield_prop(f, k, r, c, p, v) {
            (f = this.get_form(f)) && LUF.field_prop(f, k, 1, r, c, p, v);
            return this;
        }
        toggle_field(f, k, e) {
            (f = this.get_form(f)) && LUF.toggle_field(f, k, 0, null, 0, e);
            return this;
        }
        toggle_table(f, k, e) {
            (f = this.get_form(f)) && LUT.toggle_table(f, k, e ? 1 : 0);
            return this;
        }
        toggle_table_add(f, k, e) {
            (f = this.get_form(f)) && LUT.toggle_table_add(f, k, e ? 1 : 0) && LUF.reload_field(f, k);
            return this;
        }
        toggle_table_edit(f, k, i, e) {
            if (!this.$isArrVal(i)) {
                if (e == null) e = i;
                i = null;
            }
            (f = this.get_form(f)) && LUT.toggle_table_edit(f, k, i, e ? 1 : 0) && LUF.reload_field(f, k);
            return this;
        }
        toggle_table_del(f, k, e) {
            (f = this.get_form(f)) && LUT.toggle_table_del(f, k, e ? 1 : 0) && LUF.reload_field(f, k);
            return this;
        }
        toggle_table_sort(f, k, e) {
            (f = this.get_form(f)) && LUT.toggle_table_sort(f, k, e ? 1 : 0) && LUF.reload_field(f, k);
            return this;
        }
        toggle_table_check(f, k, e) {
            (f = this.get_form(f)) && LUT.toggle_table_check(f, k, e ? 1 : 0) && LUF.reload_field(f, k);
            return this;
        }
        toggle_tfield(f, k, c, e) {
            (f = this.get_form(f)) && LUF.toggle_field(f, k, 1, null, c, e);
            return this;
        }
        toggle_rfield(f, k, r, c, e) {
            (f = this.get_form(f)) && LUF.toggle_field(f, k, 1, r, c, e);
            return this;
        }
        field_view(f, k, s) { return this.field_prop(f, k, 'hidden', s ? 0 : 1); }
        tfield_view(f, k, c, s) { return this.tfield_prop(f, k, c, 'hidden', s ? 0 : 1); }
        rfield_view(f, k, r, c, s) { return this.rfield_prop(f, k, r, c, 'hidden', s ? 0 : 1); }
        field_desc(f, k, m) {
            (f = this.get_form(f)) && LUF.field_desc(f, k, 0, null, 0, m);
            return this;
        }
        tfield_desc(f, k, c, m) {
            (f = this.get_form(f)) && LUF.field_desc(f, k, 1, null, c, m);
            return this;
        }
        rfield_desc(f, k, r, c, m) {
            (f = this.get_form(f)) && LUF.field_desc(f, k, 1, r, c, m);
            return this;
        }
        get_field_desc(f, k, b) {
            return ((f = this.get_form(f)) && LUF.get_field_desc(f, k, 0, null, 0, b)) || '';
        }
        get_tfield_desc(f, k, c, b) {
            return ((f = this.get_form(f)) && LUF.get_field_desc(f, k, 1, null, c, b)) || '';
        }
        get_rfield_desc(f, k, r, c, b) {
            return ((f = this.get_form(f)) && LUF.get_field_desc(f, k, 1, r, c, b)) || '';
        }
        field_status(f, k, m) {
            (f = this.get_form(f)) && LUF.field_status(f, k, 0, null, 0, m);
            return this;
        }
        tfield_status(f, k, c, m) {
            (f = this.get_form(f)) && LUF.field_status(f, k, 1, null, c, m);
            return this;
        }
        rfield_status(f, k, r, c, m) {
            (f = this.get_form(f)) && LUF.field_status(f, k, 1, r, c, m);
            return this;
        }
    }
    
    
    class LevelUpCache {
        constructor(pfx) {
            this._s = localStorage;
            this._p = LU.$isStrVal(pfx) ? pfx : 'lu_';
        }
        has(k) { return this._get(k) != null; }
        get(k) { return (k = this._get(k)) && k.___ != null ? k.___ : k; }
        pop(k) {
            let v = this.get(k);
            if (v != null) this.del(k);
            return v;
        }
        set(k, v, t) {
            if (!LU.$isStrVal(k)) return this;
            v = {___: v};
            if (cint(t) > 0) v.e = (new Date()).getTime() + (cint(t) * 1000);
            try { this._s.setItem(this._p + k, LU.$toJson(v)); } catch(_) {}
            return this;
        }
        del(k) {
            if (LU.$isStrVal(k)) try { this._s.removeItem(this._p + k); } catch(_) {}
            return this;
        }
        clear() {
            let l = 0;
            try { l = this._s.length; } catch(_) { return this; }
            for (let i = 0, k; i < l; i++)
                try {
                    LU.$isStrVal((k = this._s.key(i))) && k.startsWith(this._p) && this._s.removeItem(k);
                } catch(_) {}
            return this;
        }
        _get(k) {
            if (!LU.$isStrVal(k)) return;
            let v;
            try { v = this._s.getItem((k = this._p + k)); } catch(_) { return; }
            if (v == null || (v = LU.$parseJson(v)) == null || v.___ == null) return v;
            if (v.e != null && v.e < (new Date()).getTime()) {
                try { this._s.removeItem(k); } catch(_) {}
                return;
            }
            return v.___;
        }
    }
    LevelUp.prototype.cache = function() { return this._cache || (this._cache = new LevelUpCache(this._real)); };
    
    
    class LevelUpTable {
        constructor(n) {
            this._c = [];
            this._n = (n || 0) + 1;
            for (let x = 0; x < this._n; x++) { this._c[x] = []; }
        }
        get length() { return this._c[0].length; }
        col(i) { return this._c[i && i < this._n ? i : 0]; }
        idx(v, i) { return this.col(i).indexOf(v); }
        has(v, i) { return this.col(i).includes(v); }
        add() {
            let a = arguments, i = this.idx(a[0]), l = a.length;
            if (i < 0) for (let x = 0; x < this._n; x++) { this._c[x].push(x < l ? a[x] : null); }
            else for (let x = 1; x < this._n; x++) { if (x < l) this._c[x][i] = a[x]; }
            return this;
        }
        del(v, i) {
            i = this.idx(v, i);
            if (i >= 0) for (let x = 0; x < this._n; x++) { this._c[x].splice(i, 1); }
            return this;
        }
        row(v, i) {
            if ((i = this.idx(v, i)) < 0) return;
            let r = [];
            for (let x = 0; x < this._n; x++) { r[x] = this._c[x][i]; }
            return r;
        }
        val(v, i, x) {
            if ((i = this.idx(v, i)) < 0) return;
            return this.col(x)[i];
        }
        clear() {
            if (this.length) for (let x = 0; x < this._n; x++) { this._c[x] = []; }
            return this;
        }
    }
    LevelUp.prototype.table = function(cols) { return new LevelUpTable(cols); };
    
    
    class LevelUpImage {
        constructor(pfx) {
            this._c = new LevelUpCache(pfx + 'img_');
        }
        load(u, w, h, t) {
            if (!LU.$isStrVal(u)) return u;
            w = LU.$isNum(w) ? w : 0;
            h = LU.$isNum(h) ? h : 0;
            let k = u + (w > 0 ? '_w' + w : '') + (h > 0 ? '_h' + h : ''),
            v = this._c.get(k);
            if (LU.$isStrVal(v)) return v;
            let i = new Image();
            i.src = u;
            i.crossOrigin = 'Anonymous';
            i.onload = LU.$afn(function(me, k) {
                let c = LU.$makeElem('canvas'),
                x = c.getContext('2d');
                c.width = w > 0 ? w : this.width;
                c.height = h > 0 ? h : this.height;
                x.drawImage(this, 0, 0);
                let e = u.split('.').pop().toLowerCase();
                e = 'image/' + (e === 'jpg' ? 'jpeg' : e);
                me._c.set(k, c.toDataURL(e), t);
            }, [this, k], i);
            return u;
        }
    }
    LevelUp.prototype.image = function() { return this._image || (this._image = new LevelUpImage(this._real)); };
    
    
    class Gocardless extends LevelUp {
        constructor() {
            super(
                __("ERPNext Gocardless Bank"),
                "gocardless", "Gocardless",
                "erpnext_gocardless_bank.libs", 0
            );
            
            this.$xdef({
                is_ready: false,
                is_enabled: false,
                is_debug: false,
            });
            this._bank_link = {};
            this.request(
                'get_settings', null, this._init,
                function() { this._error('Getting settings failed.'); }
            );
        }
        _init(opts) {
            this._is_ready = true;
            opts && this.$xdef(opts);
            this._prod = !this._is_debug;
            this.xreal('status_changed', function(ret) {
                let old = this._is_enabled;
                ret && this.$xdef(ret);
                this._prod = !this._is_debug;
                this._is_enabled !== old && this.emit('changed');
            })
            .emit('ready');
        }
        connect_to_bank(company, id, transaction_days, docname, success, error) {
            transaction_days = cint(transaction_days || 0);
            var key = [company, id, transaction_days];
            if (docname) key.push(docname);
            key = key.join('-');
            if (this._bank_link[key]) {
                let data = this._bank_link[key];
                this.$isFunc(success) && success(
                    data.link,
                    data.ref_id,
                    data.id,
                    data.access_valid_for_days
                );
                return;
            }
            
            var ref_id = '_' + Math.random().toString(36).substr(2);
            let args = {
                company,
                bank_id: id,
                ref_id: ref_id,
                transaction_days: transaction_days,
            };
            if (docname) args.docname = docname;
            this.request(
                'get_bank_link',
                args,
                function(ret) {
                    if (!this.$isDataObj(ret))
                        return this.error('Bank link received is invalid.');
                    
                    ret.access_valid_for_days = cint(ret.access_valid_for_days || 180);
                    this._bank_link[key] = ret;
                    this._bank_link[key].ref_id = ref_id;
                    this.$isFunc(success) && success(
                        ret.link,
                        ref_id,
                        ret.id,
                        ret.access_valid_for_days
                    );
                },
                function(e) {
                    this.error(e.self ? e.message : __('Unable to get Gocardless bank link data.'));
                    this.$isFunc(error) && error(e);
                }
            );
        }
    }
    
    
    frappe.gc = function() {
        if (!frappe.gc._) frappe.gc._ = new Gocardless();
        return frappe.gc._;
    };
    
    
    $(document).ready(function() {
        if (!frappe || typeof frappe !== 'object')
            throw new Error('Frappe framework is required.');
        let id = 'core-polyfill';
        function $onload() {
            Promise.wait = function(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); };
            Promise.prototype.timeout = function(ms) {
                return Promise.race([this, Promise.wait(ms).then(function() { throw new Error('Time out'); })]);
            };
        }
        if (
            LU.$isFunc(Promise) && LU.$isFunc(id.trim)
            && LU.$isFunc(id.includes) && LU.$isFunc(id.startsWith)
            && LU.$isFunc(id.endsWith) && LU.$isFunc([].includes)
            && LU.$isFunc(LU.$isFunc.bind)
        ) $onload();
        else if (LU.$hasElem(id)) $onload();
        else LU.$loadJs(
            'https://polyfill.io/v3/polyfill.min.js?features=String.prototype.trim%2CString.prototype.includes%2CString.prototype.startsWith%2CString.prototype.endsWith%2CArray.prototype.includes%2CFunction.prototype.bind%2CPromise',
            {id: id, onload: $onload}
        );
        $.fn.hidden = function(s) { return this.toggleClass('lu-hidden', !!s); };
        $.fn.isHidden = function() { return this.hasClass('lu-hidden'); };
        !LU.$hasElem('lu-style') && LU.$load('.lu-hidden { display: none; }', {id: 'lu-style'});
    });
}());