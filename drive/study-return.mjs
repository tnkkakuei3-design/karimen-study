const link=document.getElementById('study-return');
const from=new URLSearchParams(location.search).get('from')==='honmen'?'honmen':'karimen';
if(from==='honmen'){
 link.href='../honmen.html';link.querySelector('span').textContent='本免';link.setAttribute('aria-label','本免の学習に戻る');
}
document.getElementById('drive-home').href='./?from='+from;
