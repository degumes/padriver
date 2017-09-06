const svg = require('virtual-hyperscript-svg');
const h = require('virtual-dom/h');
const diff = require('virtual-dom/diff');
const patch = require('virtual-dom/patch');
const create = require('virtual-dom/create-element');

const svgBox = function(...innerTree){
    return svg("svg", {viewBox:"0 0 100 100"},...innerTree)
}

const cgen = function(att){
    return svg("circle",att)
}

window.vd = {
    svg:svg,
    h:h,
    diff:diff,
    patch:patch,
    create:create
}
document.addEventListener('DOMContentLoaded', ()=>{
    padstream[0].then(pad=>{
        // svg boilerplate
        let s0 = svgBox(cgen({cx:"50",cy:"50",r:"5", id:"c"}))
        let noh = create(s0)
        document.getElementById("k0").append(noh)
        // draw circle
        let t0 = 0
        let cx = 50.0
        let cy = 50.0

    	pad.stream.observe((e)=>{
            //`{"timestamp":${t},"v":${dx},"h":${dy}}`
            const j = JSON.parse(e)
            const dx = parseFloat(j.h)
            const dy = parseFloat(j.v)
            const tn = parseFloat(j.timestamp)
            const vdt = 0.2*(tn-t0)
            t0 = tn
            cx += dx*vdt
            cy += dy*vdt
            cx < 0 ? cx=0 : undefined ;
            cx > 100 ? cx=100 : undefined ;
            cy < 0 ? cy=0 : undefined ;
            cy > 100 ? cy=100 : undefined ;
            const sn = svgBox(cgen({cx:cx,cy:cy,r:"5", id:"c"}))
            const delta = diff(s0,sn)
            noh = patch(noh,delta)
            s0 = sn
        })
    })
});

/*


.toFixed(2)
*/
