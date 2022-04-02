import * as React from 'react';
import { useState, useEffect } from 'react';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

import MintModal from '../mint-modal/mint-modal.component';

import { call_create, call_mint, query_AssetClassOwnership } from '../../services/iris-assets.service';

export default function ContentManagementView(props) {

    const [assetClasses, setAssetClasses] = useState([]);

    const unsub_assetClasses = async () => await query_AssetClassOwnership(
      props.api, 
      props.account.address, 
      assetClassesRaw => {
        let assetClassIds = assetClassesRaw[0].map(item => item.words);
        setAssetClasses(assetClassIds);
      }
    );

    useEffect(() => {
      if (props.api) unsub_assetClasses();
    }, []);

    const handleMint = async (beneficiary, asset_id, amount) => {
      await call_mint(
        props.api, props.account, beneficiary, asset_id, amount,
        result => {
          props.emit('Mint: ' + amount + ' assets with id ' + asset_id + ': in block');
        }, result => {
          props.emit('Mint: ' + amount + ' assets with id ' + asset_id + ': finalized');
        },
      );
    };

    const captureFile = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const file = e.target.files[0];
      let reader = new FileReader();
      reader.onloadend = async () => {
        const resultString = arrayBufferToString(reader.result);
        await handleAddBytes(resultString, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  
    const handleAddBytes = async (bytes, name) => {
      const res = await props.ipfs.add(bytes);
      const ipv4 = process.env.REACT_APP_IPV4;
      if (ipv4 === undefined) {
        console.error("Please provide the REACT_APP_IPV4 environment variable to use this functionality.");
      } else {
        const id = await props.ipfs.id();
        const multiAddress = ['', 'ip4', ipv4, 'tcp', '4001', 'p2p', id.id ].join('/');
        const assetId = Math.floor(Math.random()*1000);
        await call_create(
          props.api, props.account, multiAddress, res.path, // the cid
          name, assetId, 1,
          result => {
            props.emit('Create: asset with id ' + assetId + ': in block');
          },
          result => { 
            props.emit('Create: asset with id ' + assetId + ': finalized');
            unsub_assetClasses();
          }
        );
      }
    }
  
    const arrayBufferToString = (arrayBuffer) => {
      return new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer));
    }  

    return (
        <div className="container">
          <div className='title-container'>
            <span className='section-title'>Content Management</span>
          </div>
          <div>
            <input 
              id="file-input" 
              className="file-input" 
              type="file" 
              onChange={captureFile} 
              value="" 
              autoComplete={"new-password"}
            />
          </div>
          { assetClasses.length === 0 ? 
            <span>
              No owned content. Upload some data to get started.
            </span>
          : 
            <TableContainer component={Paper}>
              <Table size="small" aria-label="a dense table">
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Asset Id</TableCell>
                    <TableCell align="right">Mint</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assetClasses.map((item, idx) => (
                    <TableRow key={ idx }>
                      <TableCell align="right">{ item[0]  }</TableCell>
                      <TableCell align="right">
                        <MintModal
                          assetId={ item[0] }
                          mint={ handleMint } 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          }
        </div>
      );
}
