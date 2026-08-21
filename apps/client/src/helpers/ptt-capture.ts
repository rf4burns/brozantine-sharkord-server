let capturingPttKeybind = false;

const setCapturingPttKeybind = (capturing: boolean) => {
  capturingPttKeybind = capturing;
};

const isCapturingPttKeybind = () => capturingPttKeybind;

export { isCapturingPttKeybind, setCapturingPttKeybind };
