"use strict";

if('requestAnimationFrame' in window && 'GamepadEvent' in window){
    window.padstream = []
    const ppad = []
    for(let i=0; i<4; i++){
        window.padstream.push(new Promise((resolve, reject)=>{
            ppad.push({resolve:resolve,reject:reject})
        }))
    }

    window.addEventListener("gamepadconnected", (e)=>{
        const pad = {}
        pad.idx = e.gamepad.index

        const mostcreate = require('@most/create')
        const streamtap = {}
        streamtap.add = function(){}
        streamtap.end = function(){}
        streamtap.err = function(){}
        pad.tap = streamtap

        pad.stream = mostcreate.create((add,end,err)=>{
            streamtap.add = add
            streamtap.end = end
            streamtap.err = err

            const _gl = genloop(pad)
            _gl.next()
            const gl = _gl.next.bind(_gl)
            pad.gl = gl

            pad.aFI = requestAnimationFrame(pad.gl)
        })

        ppad[pad.idx].resolve(pad)
        console.dir(e.gamepad);

        window.addEventListener("gamepaddisconnected", (e)=>{
            console.log("Gamepad disconnected from index %d",e.gamepad.index)
            window.padstream[e.gamepad.index].then(pad=>{
                pad.tap.end()
                cancelAnimationFrame(pad.aFI)
            })
            /*
            **  chrome bug:
            **    reflesh page ->
            **      gamepaddisconnected fires,
            **      gamepadconnected not fires
            */
            window.padstream[e.gamepad.index] = new Promise((resolve, reject)=>{
                ppad[e.gamepad.index] = {resolve:resolve,reject:reject}
            })
        })
    })
}else{
    console.error("browser sem suporte apropriado")
}

function* genloop(pad){
    let lstDraw = 0
    let dt
    let t

    let snappad;

    while(true){
        t = yield
        snappad = navigator.getGamepads()[pad.idx]
        // windows:
        //let {axes:[dx,dy]} = snappad
        // linux:
        let {axes:[dx,undefined,dy]} = snappad

        pad.tap.add(`{"timestamp":${t},"v":${dy},"h":${dx}}`)

        pad.aFI = requestAnimationFrame(pad.gl)
    }
}

/*
padstream[0].then(pad=>{
	pad.stream.observe(console.log)
})
*/
