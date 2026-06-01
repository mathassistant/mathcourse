var ALL_MANIFESTS = {
  "point-line-plane": {
    "id": "point-line-plane",
    "name": "点线面：几何世界的元老",
    "subject": "math",
    "grade": 3,
    "stage": "elementary",
    "domain": "geometry",
    "lesson_type": "inquiry-project",
    "description": "小学三年级几何入门探究课。从身边的实物出发，认识点、线、面三个几何基本元素，通过“点动成线”、“线动成面”的动手实验，理解维度递进关系，建立从具象到抽象的几何思维。",
    "tags": [
      "几何入门",
      "点线面",
      "探究课",
      "维度",
      "小学数学"
    ],
    "prerequisites": [],
    "has_canvas": true,
    "has_geogebra": true,
    "has_knowledge_graph": true
  },
  "array-to-area": {
    "id": "array-to-area",
    "name": "从方阵到面积——乘法与几何的奇妙联结",
    "subject": "math",
    "grade": "3",
    "stage": "elementary",
    "domain": "geometry",
    "lesson_type": "inquiry-project",
    "description": "通过排方阵的生活场景，找到乘法与面积之间的奇妙联系。每行几人就是长，排了几行就是宽，总数就是面积！三个Canvas互动动画帮你一探究竟。",
    "tags": [
      "乘法",
      "面积",
      "方阵",
      "长×宽",
      "类比思维",
      "Canvas动画"
    ],
    "prerequisites": [
      "math-elementary-multiplication",
      "point-line-plane"
    ],
    "has_canvas": true,
    "has_geogebra": false,
    "has_knowledge_graph": true
  },
  "perimeter-rectangle-square": {
    "id": "perimeter-rectangle-square",
    "name": "长方形和正方形的周长",
    "subject": "math",
    "grade": "3",
    "stage": "elementary",
    "domain": "geometry",
    "lesson_type": "inquiry-project",
    "description": "通过动手探究，发现长方形和正方形周长的计算规律。学生操作互动画布改变图形尺寸，观察周长变化，自主推导公式 C=2×(a+b) 和 C=4a，最终将知识迁移到生活场景。",
    "tags": [
      "小学数学",
      "几何",
      "周长",
      "探究学习"
    ],
    "prerequisites": [
      "认识长方形和正方形"
    ],
    "has_canvas": true,
    "has_geogebra": false,
    "has_knowledge_graph": true
  },
  "id-card-encoding": {
    "id": "id-card-encoding",
    "name": "身份证里的数学秘密——编码与校验码",
    "subject": "math",
    "grade": "4",
    "stage": "elementary",
    "domain": "applied-math",
    "lesson_type": "inquiry-project",
    "description": "拆解身份证18位数字背后的编码秘密！地址码、生日码、顺序码、校验码——每一段都有数学含义。通过动画一步步算出校验码，亲手做错误检测实验，理解编码的数学原理。配有8段Edge Neural TTS音频讲解。",
    "tags": [
      "编码",
      "校验码",
      "身份证",
      "模运算",
      "除法余数",
      "错误检测"
    ],
    "prerequisites": [
      "math-elementary-multiplication",
      "math-elementary-division"
    ],
    "has_canvas": true,
    "has_geogebra": false,
    "has_knowledge_graph": true
  },
  "area-vs-perimeter": {
    "id": "area-vs-perimeter",
    "name": "area-vs-perimeter",
    "subject": "math",
    "grade": "elementary-3",
    "stage": "elementary",
    "domain": "geometry",
    "lesson_type": "",
    "description": "同一个长方形，铺地砖算面积，围栅栏算周长。通过互动对比画布，一次看清楚两个概念的区别。",
    "tags": [],
    "prerequisites": [
      "array-to-area",
      "perimeter-rectangle-square"
    ],
    "has_canvas": false,
    "has_geogebra": false,
    "has_knowledge_graph": false
  }
};
