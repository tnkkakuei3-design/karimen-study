const link=document.getElementById('study-return');
if(new URLSearchParams(location.search).get('from')==='honmen'){
 link.href='../honmen.html';link.textContent='← 本免の学習に戻る';
}
